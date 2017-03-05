/*
 * Copyright (C) 2017 Stefano D'Angelo <zanga.mail@gmail.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

module.exports = function (Marca) {
	Marca.DOMElementMath = Object.create(Marca.DOMElement);
	Marca.DOMElementMath.name = "math";
	Marca.DOMElementMath.initContent = function (node) {
		var ta = Marca.DOMElement.initContent.call(this, node);

		this.id = node.attributes.id;
		if (node.attributes.class) {
			var s = node.attributes.class.trim();
			this.class = s ? s.split(/\s+/) : undefined;
		} else
			this.class = undefined;

		return ta;
	};
	Marca.DOMElementMath.initContentEmpty = function (node) {
		var ta = Marca.DOMElementMath.initContent.call(this, node);

		for (var i = 0; i < this.children.length; i++) {
			var child = this.children[i];
			if (!(Marca.DOMElementText.isPrototypeOf(child))
			    || !/^\s*$/.test(child.text))
				throw this.name + " element does not only "
				      + "contain white space";
		}

		return ta;
	};
	Marca.DOMElementMath.initContentImplicit = function (node) {
		var ta = Marca.DOMElementMath.initContent.call(this, node);

		for (var i = 0; i < this.children.length; i++) {
			var child = this.children[i];
			if (!Marca.DOMElementText.isPrototypeOf(child))
				continue;
			child.text = child.text.replace(/\s+/g, " ").trim();
			if (child.text == "") {
				this.children.splice(i, 1);
				for (var j = 0; j < ta.length; j++)
					if (ta[j].position > i)
						ta[j].position--;
				i--;
				continue;
			}
			if (!/\s/.test(child.text))
				continue;

			var t = child.text.split(" ");
			var a = new Array(t.length);
			for (var j = 0; j < t.length; j++) {
				a[j] = Object.create(child);
				a[j].text = t[j];
			}
			this.children.splice
			    .apply(this.children, [i, 1].concat(a));
			for (var j = 0; j < ta.length; j++)
				if (ta[j].position > i)
					ta[j].position += a.length - 1;
			i += a.length - 1;
		}

		return ta;
	};
	Marca.DOMElementMath.initContentExplicit = function (node) {
		var ta = Marca.DOMElementMath.initContent.call(this, node);

		var prevChild, child, nextChild;
		var prevChildIsText, childIsText, nextChildIsText;
		var deleted = false;
		for (var i = 0; i <= this.children.length; i++) {
			if (Marca.DOMElementMathDefinition
				 .isPrototypeOf(this.children[i]))
				continue;

			if (!deleted) {
				prevChild = child;
				prevChildIsText = childIsText;
			}
			deleted = false;
			child = nextChild;
			childIsText = nextChildIsText;
			nextChild = this.children[i];
			nextChildIsText =
				Marca.DOMElementText.isPrototypeOf(nextChild)
				|| Marca.DOMElementMathSpace
					.isPrototypeOf(nextChild);

			if (!childIsText
			    || Marca.DOMElementMathSpace.isPrototypeOf(child))
				continue;

			child.text = child.text.replace(/\s+/g, " ");
			if (!prevChild
			    || (prevChildIsText && /\s$/.test(prevChild.text)))
				child.text = child.text.replace(/^\s+/, "");
			if (!nextChild
			    || (nextChildIsText && /^\s/.test(nextChild.text)))
				child.text = child.text.replace(/\s$/, "");
			if (child.text == "") {
				i--;
				var k = i;
				while (Marca.DOMElementMathDefinition
					    .isPrototypeOf(this.children[k]))
					k--;
				this.children.splice(k, 1);
				deleted = true;

				for (var j = 0; j < ta.length; j++)
					if (ta[j].position > k)
						ta[j].position--;
			}
		}

		return ta;
	};

	Marca.DOMElementMathRoot = Object.create(Marca.DOMElementMath);
	Marca.DOMElementMathRoot.name = "math root";
	Marca.DOMElementMathRoot.initContent = function (node) {
		var ta = Marca.DOMElementMath.initContentExplicit
			      .call(this, node);

		this.definitions = [];
		this.instances = [];

		for (var i = 0; i < this.children.length; i++) {
			var child = this.children[i];
			if (Marca.DOMElementMathDefinition.isPrototypeOf(child))
				this.definitions.push(child);
			else if (Marca.DOMElementText.isPrototypeOf(child)
				 || Marca.DOMElementMathElementInstance
					 .isPrototypeOf(child))
				this.instances.push(child);
			else
				throw this.name + " element's child is not a "
				      + "math element instance or text element";
		}

		function bindPh(element, definitions) {
			for (var i = 0; element.children
					&& i < element.children.length; i++) {
					var e = element.children[i];
				bindPh(e, definitions);
			}
			if (!Marca.DOMElementMathPlaceholder
				  .isPrototypeOf(child))
				return;
			for (var i = 0; i < definitions.length; i++) {
				var d = definitions[i];
				if (d.id == element["for"]) {
					element.definition = d;
					break;
				}
			}
		}
		bindPh(this, this.definitions);

		function propagateStyle(element, italic, bold, big) {
			if (element.italic !== undefined)
				italic = element.italic;
			if (element.bold !== undefined)
				bold = element.bold;
			if (element.big !== undefined)
				big = element.big;

			if (Marca.DOMElementText.isPrototypeOf(element)
			    || Marca.DOMElementMathSpace.isPrototypeOf(element))
			{
				element.renderItalic = italic;
				element.renderBold = bold;
				element.renderBig = big;
				return;
			}

			for (var i = 0; i < element.children.length; i++)
				propagateStyle(element.children[i],
					       italic, bold, big);
		};
		propagateStyle(this, true, false, false);

		return ta;
	};

	Marca.DOMElementMathElement = Object.create(Marca.DOMElementMath);
	Marca.DOMElementMathElement.name = "math element";
	Marca.DOMElementMathElement.superInitContent =
		Marca.DOMElementMath.initContent;
	Marca.DOMElementMathElement.initContent = function (node) {
		var ta = this.superInitContent.call(this, node);

		this.delimiterLeft = node.attributes["delimL"];
		this.delimiterRight = node.attributes["delimR"];
		if ("delims" in node.attributes) {
			var s = node.attributes["delims"].trim();
			if (!/^\S+ \S+$/.test(s))
				throw "invalid syntax for " + this.name
				      + "'s delims attribute";
			s = s.split(" ");
			if (!this.delimiterLeft)
				this.delimiterLeft = s[0];
			if (!this.delimiterRight)
				this.delimiterRight = s[1];
		}
		this.italic = "italic" in node.attributes
			      ? node.attributes.italic == "yes" : undefined;
		this.bold = "bold" in node.attributes
			    ? node.attributes.bold == "yes" : undefined;
		this.big = "big" in node.attributes
			    ? node.attributes.big == "yes" : undefined;

		for (var i = 0; i < this.children.length; i++) {
			var child = this.children[i];
			if (!(Marca.DOMElementText.isPrototypeOf(child))
			    && !(Marca.DOMElementMathElementInstance
				     .isPrototypeOf(child)))
				throw this.name + " element's child is not a "
				      + "math element instance or text element";
		}

		return ta;
	};

	Marca.DOMElementMathElementInstance =
		Object.create(Marca.DOMElementMathElement);
	Marca.DOMElementMathElementInstance.name = "math element instance";

	Marca.DOMElementMathSpace =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathSpace.name = "math space";
	Marca.DOMElementMathSpace.superInitContent =
		Marca.DOMElementMath.initContentEmpty;
	Marca.DOMElementMathSpace.initContent = function (node) {
		var ta = Marca.DOMElementMathElementInstance
			      .initContent.call(this, node);

		this.size = "size" in node.attributes
			    ? parseFloat(node.attributes.size) : undefined;

		return ta;
	};

	Marca.DOMElementMathExpression =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathExpression.name = "math expression";
	Marca.DOMElementMathExpression.superInitContent =
		Marca.DOMElementMath.initContentExplicit;

	Marca.DOMElementMathScripted =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathScripted.name = "math scripted";
	Marca.DOMElementMathScripted.superInitContent =
		Marca.DOMElementMath.initContentImplicit;
	Marca.DOMElementMathScripted.initContent = function (node) {
		var ta = Marca.DOMElementMathElementInstance
			      .initContent.call(this, node);

		if (this.children.length < 2 || this.children.length > 5)
			throw this.name + " element has wrong number of "
			      + "children";

		var pos;
		if ("pos" in node.attributes) {
			pos = node.attributes.pos.replace(/\s+/g, " ").trim()
						 .split(" ");
			if (pos.length != this.children.length - 1)
				throw this.name + " element's pos attribute "
				      + "does not match with number of "
				      + "children";
		} else
			pos = ["tl", "bl", "br", "tr"]
			      .slice(0, this.children.length - 1);
		var p = { tl: "topLeft", bl: "bottomLeft", br: "bottomRight",
			  tr: "topRight" };
		for (var i = 0; i < pos.length; i++) {
			if (!(pos[i] in p))
				throw this.name + " element's pos attribute is "
				      + "not valid";
			if (this[p[pos[i]]])
				throw this.name + " element's  pos attribute"
				      + " contains duplicates";
			this[p[pos[i]]] = this.children[i + 1];
		}
		this.main = this.children[0];
		this.scaled = "scaled" in node.attributes
			      ? node.attributes.scaled == "yes" : undefined;

		return ta;
	};

	Marca.DOMElementMathStack =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathStack.name = "math stack";
	Marca.DOMElementMathStack.superInitContent =
		Marca.DOMElementMath.initContentImplicit;
	Marca.DOMElementMathStack.initContent = function (node) {
		var ta = Marca.DOMElementMathElementInstance
			      .initContent.call(this, node);

		var pos = "over";
		if (this.children.length == 2) {
			if ("pos" in node.attributes) {
				if (node.attributes.pos == "u")
					pos = "under";
				else if (node.attributes.pos != "o")
					throw this.name + " element's pos "
					      + "attribute is not valid";
			}
			this.main = this.children[0];
			this[pos] = this.children[1];
		} else if (this.children.length == 3) {
			this.main = this.children[0];
			this.over = this.children[1];
			this.under = this.children[2];
		} else
			throw this.name + " element has wrong number of "
			      + "children";

		this.mainStretched = undefined;
		this.overStretched = undefined;
		this.underStretched = undefined;
		if ("stretched" in node.attributes) {
			var s = node.attributes.stretched.replace(/\s+/g, " ")
				    .trim().split(" ");
			if (s.length != this.children.length)
				throw this.name + " element's stretched "
				      + "attribute does not match number of "
				      + "children";
			this.mainStretched = s[0] == "yes";
			if (this.children.length == 2)
				this[pos + "Stretched"] = s[1] == "yes";
			else {
				this.overStretched = s[1] == "yes";
				this.underStretched = s[2] == "yes";
			}
		}
		this.shifted = "shifted" in node.attributes
			       ? node.attributes.shifted == "yes" : undefined;
		this.scaled = "scaled" in node.attributes
			      ? node.attributes.scaled == "yes" : undefined;

		return ta;
	};

	Marca.DOMElementMathNthRoot =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathNthRoot.name = "math n-th root";
	Marca.DOMElementMathNthRoot.superInitContent =
		Marca.DOMElementMath.initContentImplicit;
	Marca.DOMElementMathNthRoot.initContent = function (node) {
		var ta = Marca.DOMElementMathElementInstance
			      .initContent.call(this, node);

		if (this.children.length > 2)
			throw this.name + " element has wrong number of "
			      + "children";
		this.radicand = this.children[0];
		this.index = this.children.length == 2 ? this.children[1]
						       : undefined;
		this.scaled = "scaled" in node.attributes
			      ? node.attributes.scaled == "yes" : undefined;

		return ta;
	}

	Marca.DOMElementMathGrid =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathGrid.name = "math grid";
	Marca.DOMElementMathGrid.superInitContent =
		Marca.DOMElementMath.initContentImplicit;
	Marca.DOMElementMathGrid.initContent = function (node) {
		var ta = Marca.DOMElementMathElementInstance
			      .initContent.call(this, node);

		if (!("size" in node.attributes))
			throw this.name + " element has no size attribute";
		var size = node.attributes.size.replace(/\s+/g, " ").trim()
					       .split(" ");
		if (size.length != 2)
			throw this.name + " element's size attribute is not "
			      + "valid";
		var m = parseInt(size[0]);
		var n = parseInt(size[1]);
		if (!(m > 0) || !(n > 0))
			throw this.name + " element's size attribute is not "
			      + "valid";
		if (this.children.length != m * n)
			throw this.name + " element's size attribute does not "
			      + "match number of children";
		var k = 0;
		this.cells = new Array(m);
		for (var i = 0; i < m; i++) {
			this.cells[i] = new Array(n);
			for (var j = 0; j < n; j++) {
				this.cells[i][j] = this.children[k];
				k++;
			}
		}
		this.align = node.attributes.align;
		this.horizontalLines = undefined;
		this.verticalLines = undefined;
		if ("hl" in node.attributes) {
			this.horizontalLines = [];
			var hl = node.attributes.hl.replace(/\s+/g, " ").trim()
						   .split(" ");
			for (var i = 0; i < hl.length; i++) {
				var v = parseInt(hl[i]);
				if (!(v < m))
					throw this.name + " element's hl "
					      + "attribute is not valid";
				if (this.horizontalLines.indexOf(v) == -1)
					this.horizontalLines.push(v);
			}
		}
		if ("vl" in node.attributes) {
			this.verticalLines = [];
			var vl = node.attributes.vl.replace(/\s+/g, " ").trim()
						   .split(" ");
			for (var i = 0; i < vl.length; i++) {
				var v = parseInt(vl[i]);
				if (!(v < m))
					throw this.name + " element's vl "
					      + "attribute is not valid";
				if (this.verticalLines.indexOf(v) == -1)
					this.verticalLines.push(v);
			}
		}

		return ta;
	};

	Marca.DOMElementMathMultiline =
		Object.create(Marca.DOMElementMathExpression);
	Marca.DOMElementMathMultiline.name = "math multiline expression";
	Marca.DOMElementMathMultiline.superInitContent =
		Marca.DOMElementMath.initContentImplicit;

	Marca.DOMElementMathDefinition =
		Object.create(Marca.DOMElementMathElement);
	Marca.DOMElementMathDefinition.name = "math definition";
	Marca.DOMElementMathDefinition.superInitContent =
		Marca.DOMElementMath.initContentExplicit;

	Marca.DOMElementMathPlaceholder =
		Object.create(Marca.DOMElementMathElementInstance);
	Marca.DOMElementMathPlaceholder.name = "math placeholder";
	Marca.DOMElementMathPlaceholder.superInitContent =
		Marca.DOMElementMath.initContentEmpty;
	Marca.DOMElementMathPlaceholder.initContent = function (node) {
		var ta = Marca.DOMElementMathElementInstance
			      .initContent.call(this, node);

		if (!("for" in node.attributes))
			throw this.name + " element has no for attribute";
		this["for"] = node.attributes["for"];

		return ta;
	};

	Marca.DOMElementMathExpressionRegular =
		Object.create(Marca.DOMElementMathExpression);
	Marca.DOMElementMathExpressionRegular.name = "math regular expression";
	Marca.DOMElementMathExpressionRegular.initContent = function (node) {
		node.attributes.italic = "no";
		node.attributes.bold = "no";
		return Marca.DOMElementMathExpression
			    .initContent.call(this, node);
	};

	Marca.DOMElementMathExpressionBold =
		Object.create(Marca.DOMElementMathExpression);
	Marca.DOMElementMathExpressionBold.name = "math bold expression";
	Marca.DOMElementMathExpressionBold.initContent = function (node) {
		node.attributes.italic = "no";
		node.attributes.bold = "yes";
		return Marca.DOMElementMathExpression
			    .initContent.call(this, node);
	};

	Marca.DOMElementMathExpressionItalic =
		Object.create(Marca.DOMElementMathExpression);
	Marca.DOMElementMathExpressionItalic.name = "math italic expression";
	Marca.DOMElementMathExpressionItalic.initContent = function (node) {
		node.attributes.italic = "yes";
		node.attributes.bold = "no";
		return Marca.DOMElementMathExpression
			    .initContent.call(this, node);
	};

	Marca.DOMElementMathExpressionBoldItalic =
		Object.create(Marca.DOMElementMathExpression);
	Marca.DOMElementMathExpressionBoldItalic.name =
		"math bold italic expression";
	Marca.DOMElementMathExpressionBoldItalic.initContent = function (node) {
		node.attributes.italic = "yes";
		node.attributes.bold = "yes";
		return Marca.DOMElementMathExpression
			    .initContent.call(this, node);
	};

	Marca.DOMElementMathScriptedSuper =
		Object.create(Marca.DOMElementMathScripted);
	Marca.DOMElementMathScriptedSuper.name = "math superscripted";
	Marca.DOMElementMathScriptedSuper.initContent = function (node) {
		node.attributes.pos = "tr";
		return Marca.DOMElementMathScripted
			    .initContent.call(this, node);
	};

	Marca.DOMElementMathScriptedSub =
		Object.create(Marca.DOMElementMathScripted);
	Marca.DOMElementMathScriptedSub.name = "math subscripted";
	Marca.DOMElementMathScriptedSub.initContent = function (node) {
		node.attributes.pos = "br";
		return Marca.DOMElementMathScripted
			    .initContent.call(this, node);
	};

	Marca.DOMElementMathStackFraction =
		Object.create(Marca.DOMElementMathStack);
	Marca.DOMElementMathStackFraction.name = "math fraction";
	Marca.DOMElementMathStackFraction.initContent = function (node) {
		var t = Object.create(Marca.DOMElementText);
		t.text = "−";
		this.children.unshift(t);
		node.attributes.stretched = "yes no no";
		node.attributes.shifted = "no";
		node.attributes.scaled = "no";
		var ta = Marca.DOMElementMathStack
			      .initContent.call(this, node);
		this.children.shift();
		return ta;
	};

	Marca.MathElementProtos = {
		ms:		Marca.DOMElementMathSpace,
		mx:		Marca.DOMElementMathExpression,
		mscr:		Marca.DOMElementMathScripted,
		mstack:		Marca.DOMElementMathStack,
		mroot:		Marca.DOMElementMathNthRoot,
		mgrid:		Marca.DOMElementMathGrid,
		mml:		Marca.DOMElementMathMultiline,
		mdef:		Marca.DOMElementMathDefinition,
		mph:		Marca.DOMElementMathPlaceholder,
		mr:		Marca.DOMElementMathExpressionRegular,
		mi:		Marca.DOMElementMathExpressionItalic,
		mb:		Marca.DOMElementMathExpressionBold,
		mbi:		Marca.DOMElementMathExpressionBoldItalic,
		msup:		Marca.DOMElementMathScriptedSuper,
		msub:		Marca.DOMElementMathScriptedSub,
		mfrac:		Marca.DOMElementMathStackFraction
	};
}
