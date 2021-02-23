'use strict';

// export to global
window.Chipsable = function (config) {
  this.config = Object.assign({}, this.__proto__.config, config);
  this.chipRand = 'chipsable-style';
  this.previousKey = null;

  if (! this.config.selector) {
    throw new Error('Please, give a config.selector');
  }

  var elements = document.querySelectorAll(this.config.selector);
  var l = elements.length;
  var rand = new Uint16Array(l + 1);
  crypto.getRandomValues(rand);

  // this.chipRand = "c" + rand[l]; // CSS class cannot start with number
  // var styles = addRandStyles(getChipsStyles());
  if (! document.getElementById(this.chipRand)) {
    var styles = this.getStyles();
    this.insertStyles(styles, this.chipRand);
  }

  for (var i = 0; i < l; i++) {
    this.createWrapper(elements[i], rand[i], this.config.extractValueCallback);
  }
}

Chipsable.prototype.config = {
  selector: null,
  separator: ";",
  cleanBlanks: true,
  hideSource: true,
};

Chipsable.prototype.getStyles = function () {
  return `
.chips {
display: flex;
flex-direction: row;
  flex-wrap: wrap;
column-gap: 0.5rem;
row-gap: 0.5rem;
  border: 1px dashed transparent;
  padding: 0.1rem;
  cursor: pointer;
}
.chips:hover {
  border: 1px dashed #ccc;
}
.chips::after {
content: "+";
display: flex;
align-items: center;
border: 1px dashed #ccc;
border-radius: 0.3rem;
padding: 0 0.5rem;
color: #ccc;
}
.chips:hover::after {
color: #333;
border-color: #333;
}
.chip {
border: 1px solid #ccc;
border-radius: 0.3rem;
background-color: #eee;
display: flex;
align-items: center;
column-gap: 0.2rem;
padding: 0.2rem;
}
.chip--delete {
  border-color: red;
}
.chip--delete .chip__value {
  text-decoration: line-through;
  color: red;
}
.chip__value {
font-family: monospace;
padding: 0.3rem;
  border: 1px dashed transparent;
}
.chip__value:hover {
  border: 1px dashed #ccc;
background-color: white;
}
.chip__value[contenteditable] {
background-color: white;
cursor: text;
}
.chip__del {
padding: 0 0.2rem;
}
.chip__del:before {
  content: "\\00D7";
}
.chip__del:hover {
color: red;
}
.chip--delete .chip__del:before {
  content: "\\21BA";
}
.chip--delete .chip__del:hover {
  color: green;
}
`;
};

// Chipsable.prototype.addRandStyles = function (styles) {
//     return styles.replace(/(\.)?(chips?)/g, '$1' + chipRand + '$2');
// }

Chipsable.prototype.insertStyles = function (styles, htmlId) {
  var styleTag = document.createElement("style");
  if (htmlId) {
    styleTag.setAttribute("id", htmlId);
  }
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);
};

Chipsable.prototype.extractValueFunction = function (elt) {
  if (elt.value !== undefined) {
    return ['value', elt.value];
  } else {
    return ['innerHTML', elt.innerHTML];
  };
};

Chipsable.prototype.getSourceValue = function (elt) {
  if (typeof this.config.extractValueCallback === "function") {
    return this.config.extractValueCallback.call(this, elt);
  }

  return this.extractValueFunction(elt);
};

Chipsable.prototype.createWrapper = function (elt, rand) {
  var sources = this.getSourceValue(elt);
  elt.setAttribute("data-chips-source", rand);
  elt.setAttribute("data-chips-prop", sources[0]);
  var value = sources[1];

  if (this.config.hideSource) {
    elt.style.display = 'none';
  }

  var pieces = value.split(
    this.config.cleanBlanks
      ? new RegExp("\\s*" + this.config.separator + "+\\s*")
      : this.config.separator
  );
  // console.log(pieces);

  var parent = elt.parentNode;
  var chipsWrapper = document.createElement("div");
  chipsWrapper.setAttribute("class", "chips");
  chipsWrapper.setAttribute("data-chips-rand", rand);
  parent.appendChild(chipsWrapper);

  for (var i = 0, l = pieces.length; i < l; i++) {
    chipsWrapper.appendChild(this.create(pieces[i]));
  }

  chipsWrapper.addEventListener("click", this.clickListener.bind(this), false);
  chipsWrapper.addEventListener("keydown", this.keyListener.bind(this), false);
};

Chipsable.prototype.create = function (value, isNew) {
  isNew = isNew || false;
  var chip = document.createElement("div");
  chip.setAttribute("class", "chip" + (isNew ? " chip--new" : ""));
  chip.setAttribute("data-previous", value);

  var chipValue = document.createElement("span");
  chipValue.setAttribute("class", "chip__value");
  chipValue.setAttribute("tabindex", "0");
  chipValue.innerHTML = value;
  chip.appendChild(chipValue);

  var chipDel = document.createElement("span");
  chipDel.setAttribute("class", "chip__del");
  chipDel.setAttribute("tabindex", "0");
  chip.appendChild(chipDel);

  return chip;
};

Chipsable.prototype.keyListener = function (event) {
  // console.log('top', event);
  var elt = event.target,
    chip,
    wrap;

  var key = event.key;
  var isDel = elt.classList.contains("chip__del");
  var isValue = elt.classList.contains("chip__value");
  if (isDel || isValue) {
    chip = elt.parentNode;
  }
  var isEditing = isValue && chip.classList.contains("chip--editing");
  var isChip = elt.classList.contains("chip");
  if (isChip) {
    chip = elt;
  }

  if (isValue && ! isEditing && key === "F2") {
    event.preventDefault();
    this.edit(chip);
  } else if (isValue && key === "Enter") {
    event.preventDefault();
    if (isEditing) {
      this.close(chip);
    } else {
      this.edit(chip);
    }
  } else if (isValue && key === "Escape") {
    elt.innerHTML = chip.getAttribute("data-previous");

    if (this.isEmpty(chip)) {
      this.delete(chip);
    } else {
      this.close(chip);
      elt.blur();
    }
  } else if ((isValue && ! isEditing || isDel) && key === "Escape") {
    elt.blur();
  } else if (isEditing && key === "Tab") {
    if (this.previousKey === "Tab") {
      if (this.isEmpty(chip)) {
        // without delay, goes to first element
        setTimeout(function () {
          this.delete(chip);
        }.bind(this), 500);
      } else {
        this.close(chip);
      }
    } else {
      event.preventDefault();
    }
  } else if (isDel && (key === "Enter" || key === " ")) {
    if (chip.classList.contains("chip--delete")) {
      this.restore(chip);
    } else {
      this.delete(chip);
    }
  } else if (isDel && key === "Tab" && !event.shiftKey) {
    wrap = chip.parentNode;

    var last = wrap.querySelector(".chip:last-of-type");
    if (chip === last && !this.isEmpty(chip)) {
      event.preventDefault();
      // create new chip
      wrap.click();
    }
  }

  this.previousKey = event.key;
};

Chipsable.prototype.clickListener = function (event) {
  var elt = event.target;
  // console.log(elt);

  if (elt.classList.contains("chips")) {
    var editing = this.findEditing(elt);
    if (editing) {
      if (this.isEmpty(editing)) {
        this.edit(editing);
      } else {
        this.close(editing);
      }
    } else {
      var newChip = this.findEmpty(elt);
      if (!newChip) {
        newChip = this.create("", true);
        elt.appendChild(newChip);
      }
      this.edit(newChip);
    }
  } else if (elt.classList.contains("chip__del")) {
    var chip = elt.parentNode;
    if (chip.classList.contains("chip--delete")) {
      this.restore(chip);
    } else {
      this.delete(chip);
    }
  } else if (elt.classList.contains("chip__value")) {
    if (!elt.hasAttribute("contenteditable")) {
      this.edit(elt.parentNode);
    }
  }
};

Chipsable.prototype.isEmpty = function (chip) {
  return (
    chip.getAttribute("data-previous") === "" &&
    chip.querySelector(".chip__value").innerHTML === ""
  );
};

Chipsable.prototype.findEmpty = function (chips) {
  var empties = chips.querySelectorAll('.chip[data-previous=""]');
  for (var i = 0, l = empties.length; i < l; i++) {
    if (this.isEmpty(empties[i])) {
      return empties[i];
    }
  }
  return null;
};

Chipsable.prototype.findEditing = function (chips) {
  return chips.querySelector(".chip--editing");
};

Chipsable.prototype.edit = function (elt) {
  var chipValue = elt.querySelector(".chip__value");

  if (!elt.classList.contains("chip--editing")) {
    elt.classList.add("chip--editing");
    chipValue.setAttribute("contenteditable", true);
    elt.setAttribute("data-previous", chipValue.innerHTML);
  }
  chipValue.focus();
};

Chipsable.prototype.close = function (elt) {
  elt.classList.remove("chip--editing");
  var chipValue = elt.querySelector(".chip__value");
  chipValue.removeAttribute("contenteditable");

  this.updateSourceText(elt.parentNode);
};

Chipsable.prototype.delete = function (elt) {
  elt.classList.add("chip--delete");
  this.close(elt);

  if (this.isEmpty(elt)) {
    elt.remove();
  }
};

Chipsable.prototype.restore = function (elt) {
  elt.classList.remove("chip--delete");

  this.updateSourceText(elt.parentNode);
};

Chipsable.prototype.exportText = function (chips) {
  var chipsValues = chips.querySelectorAll(
    ".chip:not(.chip--delete) .chip__value"
  );
  var texts = [];
  for (var i = 0, l = chipsValues.length; i < l; i++) {
    texts.push(chipsValues[i].innerText);
  }

  return texts.join(this.config.separator);
};

Chipsable.prototype.updateSourceText = function (chips) {
  var text = this.exportText(chips);
  var rand = chips.getAttribute("data-chips-rand");
  var source = document.querySelector('[data-chips-source="' + rand + '"]');
  var prop = source.getAttribute('data-chips-prop');
  source[prop] = text;
};
