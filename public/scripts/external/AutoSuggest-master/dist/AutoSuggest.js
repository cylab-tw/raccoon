(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.AutoSuggest = factory());
}(this, (function () { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();



























var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var ensure = function ensure(context, object, keys) {
    [].concat(keys).forEach(function (key) {
        if (typeof object[key] === 'undefined') {
            throw new Error('AutoSuggest: Missing required parameter, ' + context + '.' + key);
        }
    });
};
var ensureAnyOf = function ensureAnyOf(context, object, keys) {
    var currentKey = void 0;
    if (!keys.some(function (key) {
        return typeof object[currentKey = key] !== 'undefined';
    })) throw new Error('AutoSuggest: Missing required parameter, ' + context + '.' + currentKey);
};
var ensureType = function ensureType(context, object, key, type) {
    [].concat(object[key]).forEach(function (value) {
        var valueType = typeof value === 'undefined' ? 'undefined' : _typeof(value);
        if (valueType !== type && valueType !== 'undefined') {
            throw new TypeError('AutoSuggest: Invalid Type for ' + context + '.' + key + ', expected ' + type);
        }
    });
};

var getComputedStyle = function getComputedStyle(element, style) {
    return window.getComputedStyle(element).getPropertyValue(style);
};

var getGlobalOffset = function getGlobalOffset($0) {
    var node = $0,
        top = 0,
        left = 0;

    do {
        left += node.offsetLeft;
        top += node.offsetTop;
    } while (node = node.offsetParent);

    return { left: left, top: top };
};

var getScrollLeftForInput = function getScrollLeftForInput(input) {
    if (input.createTextRange) {
        var range = input.createTextRange();
        var inputStyle = window.getComputedStyle(input);
        var paddingLeft = parseFloat(inputStyle.paddingLeft);
        var rangeRect = range.getBoundingClientRect();
        return input.getBoundingClientRect().left + input.clientLeft + paddingLeft - rangeRect.left;
    } else {
        return input.scrollLeft;
    }
};

var getCursorPosition = function getCursorPosition(input) {
    return [input.selectionStart, input.selectionEnd].sort(function (a, b) {
        return a - b;
    });
};

var getSelectedTextNodes = function getSelectedTextNodes() {
    var selection = window.getSelection();
    var range = selection.getRangeAt(0);

    var startContainer = range.startContainer,
        startOffset = range.startOffset,
        endContainer = range.endContainer,
        endOffset = range.endOffset;

    var direction = selection.anchorNode === startContainer && selection.anchorOffset === startOffset;

    if (startContainer.nodeType !== startContainer.TEXT_NODE) {
        startContainer = startContainer.childNodes[startOffset - 1];
        if (startContainer) {
            startContainer = getLastChildNode(startContainer);
            startOffset = startContainer.nodeValue ? startContainer.nodeValue.length : 0;
        }
    }

    if (endContainer.nodeType !== endContainer.TEXT_NODE) {
        endContainer = endContainer.childNodes[endOffset];
        if (endContainer) {
            endContainer = getFirstChildNode(endContainer);
            endOffset = 0;
        }
    }

    return { startContainer: startContainer, startOffset: startOffset, endContainer: endContainer, endOffset: endOffset, direction: direction };
};

var makeAsyncQueueRunner = function makeAsyncQueueRunner() {
    var i = 0;
    var queue = [];

    return function (f, j) {
        queue[j - i] = f;
        while (queue[0]) {
            ++i, queue.shift()();
        }
    };
};

var data = function data(element, key, value) {
    key = 'autosuggest_' + key;
    if (typeof value !== 'undefined') {
        element.dataset[key] = JSON.stringify(value);
    } else {
        value = element.dataset[key];
        return typeof value !== 'undefined' ? JSON.parse(element.dataset[key]) : value;
    }
};

var createNode = function createNode(html) {
    var div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
};

var getFirstChildNode = function getFirstChildNode(node) {
    var nextNode = node;
    while (nextNode.firstChild) {
        nextNode = nextNode.firstChild;
    }return nextNode;
};

var getLastChildNode = function getLastChildNode(node) {
    var nextNode = node;
    while (nextNode.lastChild) {
        nextNode = nextNode.lastChild;
    }return nextNode;
};

var CLONE_PROPERTIES = ['direction', // RTL support
'boxSizing', 'width', // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
'height', 'overflowX', 'overflowY', // copy the scrollbar for IE

'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',

// https://developer.mozilla.org/en-US/docs/Web/CSS/font
'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'textDecoration', // might not make a difference, but better be safe

'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize', 'whiteSpace', 'wordWrap', 'wordBreak'];

function validateSuggestions(suggestions) {
    return [].concat(suggestions).map(function (suggestion) {
        var type = typeof suggestion === 'undefined' ? 'undefined' : _typeof(suggestion);
        if (type === 'string') {
            suggestion = {
                on: [suggestion],
                show: suggestion,
                insertText: suggestion,
                focusText: [0, 0]
            };
        } else if (type === 'object') {
            try {
                ensure('Suggestion', suggestion, 'value');
            } catch (e) {
                ensure('Suggestion', suggestion, ['on', 'show']);
                ensureAnyOf('Suggestion', suggestion, ['insertHtml', 'insertText']);
            }

            ensureType('Suggestion', suggestion, 'on', 'string');
            ensureType('Suggestion', suggestion, 'show', 'string');
            ensureType('Suggestion', suggestion, 'value', 'string');
            ensureType('Suggestion', suggestion, 'insertText', 'string');
            ensureType('Suggestion', suggestion, 'insertHtml', 'string');

            suggestion.show = suggestion.show || suggestion.value;
            suggestion.insertText = suggestion.insertText || suggestion.value;
            suggestion.on = [suggestion.show].concat(suggestion.on || suggestion.value);

            suggestion.focusText = suggestion.focusText || [0, 0];
            if (suggestion.focusText.constructor !== Array) {
                ensureType('Suggestion', suggestion, 'focusText', 'number');
                suggestion.focusText = [suggestion.focusText, suggestion.focusText];
            }

            if (suggestion.insertHtml) {
                suggestion.focusHtml = suggestion.focusHtml || [0, 0];
                if (suggestion.focusHtml.constructor !== Array) {
                    ensureType('Suggestion', suggestion, 'focusHtml', 'number');
                    suggestion.focusHtml = [suggestion.focusHtml, suggestion.focusHtml];
                }
            }
        }

        return suggestion;
    });
}

function escapeRegExp(string) {
    return string.replace(/[.?+*^$[{()|\\]/g, '\\$&'); // $& means the whole matched string
}

function SuggestionList(options) {
    var _this = this;

    // validate options
    if (options && !options.values) {
        options = { values: options };
    }

    ensure('SuggestionList', options, 'values');
    ensureType('Suggestion', options, 'trigger', 'string');
    options.caseSensitive = Boolean(options.caseSensitive);

    if (typeof options.values === 'function') {
        this.getSuggestions = function (keyword, callback) {
            options.values.call(this, keyword, function (values) {
                return callback(validateSuggestions(values));
            });
        };
    } else if (options.values.constructor === Array || typeof options.values === 'string') {
        options.values = validateSuggestions(options.values);
        this.getSuggestions = function (keyword, callback) {
            var flags = !options.caseSensitive ? 'i' : '';
            var triggerRegex = _this.trigger ? '(?:' + escapeRegExp(_this.trigger) + ')?' : '';
            var commonRegex = '^' + triggerRegex + escapeRegExp(keyword);

            var matcher = new RegExp(commonRegex, flags);
            var exactMatcher = new RegExp(commonRegex + '$', flags);

            callback(options.values.filter(function (value) {
                return value.on.some(function (entry) {
                    return matcher.test(entry) && !exactMatcher.test(entry);
                });
            }));
        };
    }

    this.trigger = options.trigger;
    if (this.trigger) {
        var escapedTrigger = escapeRegExp(this.trigger);
        this.regex = new RegExp('(?:\\W+|^)' + escapedTrigger + '(\\S*)$');
    } else {
        this.regex = new RegExp('(?:^|\\s+)(\\S+)$');
    }
}

SuggestionList.prototype.getMatch = function (value) {
    return value.match(this.regex)[1];
};

var SuggestionDropdown = function () {
    function SuggestionDropdown() {
        classCallCheck(this, SuggestionDropdown);

        this.width = 0;
        this.isEmpty = true;
        this.isActive = false;

        this.dropdownContent = document.createElement('ul');
        this.dropdownContent.className = 'dropdown-menu dropdown-menu-left';

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'dropdown open';
        this.dropdown.style.position = 'absolute';

        this.hide();
        this.dropdown.appendChild(this.dropdownContent);
        document.body.appendChild(this.dropdown);
    }

    createClass(SuggestionDropdown, [{
        key: 'show',
        value: function show(position) {
            if (position) {
                this.dropdown.style.left = position.left + 'px';
                this.dropdown.style.top = position.top + 'px';

                if (position.left + this.width > document.body.offsetWidth) {
                    this.dropdownContent.classList.remove('dropdown-menu-left');
                    this.dropdownContent.classList.add('dropdown-menu-right');
                } else {
                    this.dropdownContent.classList.remove('dropdown-menu-right');
                    this.dropdownContent.classList.add('dropdown-menu-left');
                }
            }

            this.dropdown.style.display = 'block';
            this.isActive = true;
        }
    }, {
        key: 'hide',
        value: function hide() {
            this.dropdown.style.display = 'none';
            this.isActive = false;
        }
    }, {
        key: 'empty',
        value: function empty() {
            this.dropdownContent.innerHTML = '';
            this.isEmpty = true;
        }
    }, {
        key: 'fill',
        value: function fill(suggestions, onSet) {
            var _this = this;

            this.empty();
            suggestions.forEach(function (suggestion) {
                var dropdownLink = createNode('<li><a>' + suggestion.show + '</a></li>');
                _this.dropdownContent.appendChild(dropdownLink);
                data(dropdownLink, 'suggestion', suggestion);

                dropdownLink.addEventListener('mouseenter', function () {
                    _this.getActive().classList.remove('active');
                    dropdownLink.classList.add('active');
                });

                dropdownLink.addEventListener('mousedown', function (e) {
                    onSet(suggestion);
                    _this.hide();
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            // Calculate width
            if (!this.isActive) {
                this.show();
            }

            this.width = this.dropdownContent.offsetWidth;

            if (!this.isActive) {
                this.hide();
            }

            this.setActive();
            this.isEmpty = false;
        }
    }, {
        key: 'showLoader',
        value: function showLoader(position) {
            this.empty();
            this.dropdownContent.innerHTML = '<div class="autosuggest-loader">Loading...</div>';
            this.show(position);
            this.isActive = false;
        }
    }, {
        key: 'getActive',
        value: function getActive() {
            var activeLinks = Array.prototype.slice.call(this.dropdownContent.querySelectorAll('li.active'), 0);
            while (activeLinks[1]) {
                activeLinks.pop().classList.remove('active');
            }

            return activeLinks[0];
        }
    }, {
        key: 'getValue',
        value: function getValue(element) {
            return data(element || this.getActive(), 'suggestion');
        }
    }, {
        key: 'setActive',
        value: function setActive() {
            var element = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.dropdownContent.firstElementChild;
            var activeLink = arguments[1];

            activeLink && activeLink.classList.remove('active');
            element.classList.add('active');
        }
    }, {
        key: 'selectNext',
        value: function selectNext() {
            var activeLink = this.getActive();
            var nextLink = activeLink.nextElementSibling || this.dropdownContent.firstElementChild;
            this.setActive(nextLink, activeLink);
        }
    }, {
        key: 'selectPrev',
        value: function selectPrev() {
            var activeLink = this.getActive();
            var prevLink = activeLink.previousElementSibling || this.dropdownContent.lastElementChild;
            this.setActive(prevLink, activeLink);
        }
    }]);
    return SuggestionDropdown;
}();

function splitValue(originalValue, cursorPosition, trigger) {
    var value = originalValue.slice(0, cursorPosition);
    var textAfterTrigger = value.split(trigger || /\W/).pop();
    var textUptoTrigger = textAfterTrigger.length ? value.slice(0, 0 - textAfterTrigger.length) : value;
    textAfterTrigger += originalValue.slice(cursorPosition);
    return { textAfterTrigger: textAfterTrigger, textUptoTrigger: textUptoTrigger };
}

function getCharHeight() {
    for (var _len = arguments.length, elements = Array(_len), _key = 0; _key < _len; _key++) {
        elements[_key] = arguments[_key];
    }

    return Math.max.apply(Math, toConsumableArray(elements.map(function (element) {
        return parseFloat(getComputedStyle(element, 'line-height'));
    })));
}

// Invisible character
var POSITIONER_CHARACTER = '\uFEFF';
function getCaretPosition(element, trigger) {
    if (data(element, 'isInput')) {
        var _getCursorPosition = getCursorPosition(element),
            _getCursorPosition2 = slicedToArray(_getCursorPosition, 1),
            cursorPosition = _getCursorPosition2[0];

        var _splitValue = splitValue(element.value, cursorPosition, trigger),
            textAfterTrigger = _splitValue.textAfterTrigger,
            textUptoTrigger = _splitValue.textUptoTrigger;

        // pre to retain special characters


        var clone = document.createElement('pre');
        clone.id = 'autosuggest-positionclone';

        var positioner = document.createElement('span');
        positioner.appendChild(document.createTextNode(POSITIONER_CHARACTER));

        var computed = window.getComputedStyle(element);
        CLONE_PROPERTIES.forEach(function (prop) {
            clone.style[prop] = computed[prop];
        });

        var elementPosition = getGlobalOffset(element);
        clone.style.opacity = 0;
        clone.style.position = 'absolute';
        clone.style.top = elementPosition.top + 'px';
        clone.style.left = elementPosition.left + 'px';
        document.body.appendChild(clone);

        if (element.scrollHeight > parseInt(computed.height)) {
            clone.style.overflowY = 'scroll';
        } else {
            clone.style.overflow = 'hidden';
        }

        // Extra styles for the clone depending on type of input
        var charHeight = void 0;
        if (element.tagName === 'INPUT') {
            clone.appendChild(document.createTextNode(textUptoTrigger.replace(/ /g, '\xA0')));
            clone.appendChild(positioner);
            clone.appendChild(document.createTextNode(textAfterTrigger.replace(/ /g, '\xA0')));

            clone.style.overflowX = 'auto';
            clone.style.whiteSpace = 'nowrap';
            if (cursorPosition === element.value.length) {
                clone.scrollLeft = clone.scrollWidth - clone.clientWidth;
            } else {
                clone.scrollLeft = Math.min(getScrollLeftForInput(element), clone.scrollWidth - clone.clientWidth);
            }
            charHeight = clone.offsetHeight - parseFloat(computed.paddingTop) - parseFloat(computed.paddingBottom);
        } else {
            clone.appendChild(document.createTextNode(textUptoTrigger));
            clone.appendChild(positioner);
            clone.appendChild(document.createTextNode(textAfterTrigger));

            clone.style.maxWidth = '100%';
            clone.scrollTop = element.scrollTop;
            clone.scrollLeft = element.scrollLeft;
            charHeight = getCharHeight(clone, positioner);
        }

        var caretPosition = getGlobalOffset(positioner);
        var inputPosition = getGlobalOffset(element);

        caretPosition.top += charHeight - clone.scrollTop;
        caretPosition.left -= clone.scrollLeft;

        var diff = caretPosition.left - inputPosition.left;
        if (diff < 0 || diff > element.clientWidth) caretPosition.left = inputPosition.left;

        document.body.removeChild(clone);
        return caretPosition;
    } else {
        var _window$getSelection$ = window.getSelection().getRangeAt(0),
            startContainer = _window$getSelection$.startContainer,
            startOffset = _window$getSelection$.startOffset,
            endContainer = _window$getSelection$.endContainer,
            endOffset = _window$getSelection$.endOffset;

        var _getSelectedTextNodes = getSelectedTextNodes(),
            containerTextNode = _getSelectedTextNodes.startContainer,
            _cursorPosition = _getSelectedTextNodes.startOffset,
            direction = _getSelectedTextNodes.direction;

        var _splitValue2 = splitValue(containerTextNode.nodeValue, _cursorPosition, trigger),
            _textAfterTrigger = _splitValue2.textAfterTrigger,
            _textUptoTrigger = _splitValue2.textUptoTrigger;

        var parentNode = containerTextNode.parentNode;
        var referenceNode = containerTextNode.nextSibling;

        var _positioner = document.createElement("span");
        _positioner.appendChild(document.createTextNode(POSITIONER_CHARACTER));
        parentNode.insertBefore(_positioner, referenceNode);

        if (_textAfterTrigger) {
            containerTextNode.nodeValue = _textUptoTrigger;
            var remainingTextNode = document.createTextNode(_textAfterTrigger);
            parentNode.insertBefore(remainingTextNode, referenceNode);
        }

        var _caretPosition = getGlobalOffset(_positioner);
        var _charHeight = getCharHeight(_positioner);
        _caretPosition.top += _charHeight;

        // Reset DOM to the state before changes
        parentNode.removeChild(_positioner);
        if (_textAfterTrigger) {
            parentNode.removeChild(containerTextNode.nextSibling);
            containerTextNode.nodeValue = _textUptoTrigger + _textAfterTrigger;
        }

        var selection = window.getSelection();
        if (selection.setBaseAndExtent) {
            if (direction) {
                selection.setBaseAndExtent(startContainer, startOffset, endContainer, endOffset);
            } else {
                selection.setBaseAndExtent(endContainer, endOffset, startContainer, startOffset);
            }
        } else {
            var range = document.createRange();
            range.setStart(startContainer, startOffset);
            range.setEnd(endContainer, endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        return _caretPosition;
    }
}

var getNextNode = function getNextNode(node, root) {
    var nextNode = void 0;
    if (node.nextSibling) nextNode = node.nextSibling;else {
        nextNode = node.parentNode;
        while (nextNode && nextNode !== root && !nextNode.nextSibling) {
            nextNode = nextNode.parentNode;
        }if (nextNode && nextNode !== root) nextNode = nextNode.nextSibling;else return;
    }

    return getFirstChildNode(nextNode);
};

var removeNodesBetween = function removeNodesBetween(startContainer, endContainer) {
    if (startContainer === endContainer) return;
    var node = getNextNode(startContainer);
    while (node !== endContainer) {
        node.parentNode.removeChild(node);
        node = getNextNode(startContainer);
    }
};

var insertHtmlAfter = function insertHtmlAfter(node, html) {
    var psuedoDom = document.createElement('div');
    psuedoDom.innerHTML = html;

    var referenceNode = node.nextSibling;
    var appendedNodes = [];
    while (psuedoDom.firstChild) {
        appendedNodes.push(psuedoDom.firstChild);
        node.parentNode.insertBefore(psuedoDom.firstChild, referenceNode);
    }

    return appendedNodes;
};

var setValue = function setValue(_ref) {
    var element = _ref.element,
        trigger = _ref.trigger,
        suggestion = _ref.suggestion,
        onChange = _ref.onChange;

    if (data(element, 'isInput')) {
        var _getCursorPosition3 = getCursorPosition(element),
            _getCursorPosition4 = slicedToArray(_getCursorPosition3, 2),
            startPosition = _getCursorPosition4[0],
            endPosition = _getCursorPosition4[1];

        var originalValue = element.value;

        var value = originalValue.slice(0, startPosition);
        var currentValue = value.split(trigger || /\W/).pop();
        value = value.slice(0, 0 - currentValue.length - (trigger || '').length) + (suggestion.insertText || suggestion.insertHtml);
        element.value = value + originalValue.slice(endPosition);
        element.focus();

        var focus = suggestion.insertText ? suggestion.focusText : [0, 0];
        var cursorStartPosition = value.length;
        element.setSelectionRange(cursorStartPosition + focus[0], cursorStartPosition + focus[1]);
    } else {
        var _getSelectedTextNodes2 = getSelectedTextNodes(),
            startContainer = _getSelectedTextNodes2.startContainer,
            startOffset = _getSelectedTextNodes2.startOffset,
            endContainer = _getSelectedTextNodes2.endContainer,
            endOffset = _getSelectedTextNodes2.endOffset;

        var selection = window.getSelection();
        var range = document.createRange();

        var preValue = startContainer.nodeValue.slice(0, startOffset);
        var replaceValue = preValue.split(trigger || /\W/).pop();
        preValue = preValue.slice(0, 0 - replaceValue.length - (trigger || '').length);

        if (startContainer !== endContainer) {
            startContainer.nodeValue = preValue;
            removeNodesBetween(startContainer, endContainer);
            if (endContainer.nodeValue) {
                endContainer.nodeValue = endContainer.nodeValue.slice(endOffset);
            }
        } else {
            var remainingText = startContainer.nodeValue.slice(endOffset);
            if (remainingText) {
                var remainingTextNode = document.createTextNode(remainingText);
                startContainer.parentNode.insertBefore(remainingTextNode, startContainer.nextSibling);
            }
            startContainer.nodeValue = preValue;
        }

        if (suggestion.insertHtml) {
            var setSelection = function setSelection(focus, nodes, method) {
                var lastNode = void 0,
                    lastFocus = focus;
                if (lastFocus !== 0) {
                    do {
                        lastNode = nodes.pop();
                        lastFocus += lastNode.textContent.length;
                    } while (nodes.length && lastFocus < 0);

                    if (!lastNode) {
                        throw new TypeError('AutoSuggest: Invalid value provided for Suggestion.focusHtml');
                    }
                }

                if (lastFocus === 0) {
                    range[method + 'After'](nodes[nodes.length - 1] || startContainer);
                } else {
                    if (lastNode.nodeType === lastNode.TEXT_NODE) {
                        range[method](lastNode, lastFocus);
                    } else {
                        setSelection(lastFocus - lastNode.textContent.length, Array.prototype.slice.call(lastNode.childNodes, 0), method);
                    }
                }
            };

            var nodes = insertHtmlAfter(startContainer, suggestion.insertHtml);
            var _focus = nodes.length ? suggestion.focusHtml : [0, 0];

            

            setSelection(_focus[1], [].concat(toConsumableArray(nodes)), 'setEnd');
            setSelection(_focus[0], [].concat(toConsumableArray(nodes)), 'setStart');
        } else {
            startContainer.nodeValue += suggestion.insertText;
            var _focus2 = suggestion.focusText;
            var _cursorStartPosition = startContainer.nodeValue.length;

            range.setStart(startContainer, _cursorStartPosition + _focus2[0]);
            range.setEnd(startContainer, _cursorStartPosition + _focus2[1]);
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    onChange(suggestion);
};

var AutoSuggest = function () {
    function AutoSuggest(options) {
        classCallCheck(this, AutoSuggest);

        if (!options) {
            throw new Error('AutoSuggest: Missing required parameter, options');
        }

        this.inputs = [];
        this.dropdown = new SuggestionDropdown();
        this.onChange = options.onChange || Function.prototype;
        this.maxSuggestions = options.maxSuggestions || 10;

        // validate suggestions
        this.suggestionLists = options.suggestions || [];
        for (var i = 0; i < this.suggestionLists.length; i++) {
            var suggestionList = this.suggestionLists[i];
            if (!(suggestionList instanceof SuggestionList)) {
                if (suggestionList.constructor !== Object) {
                    suggestionList = { values: suggestionList };
                }

                if (!suggestionList.hasOwnProperty('caseSensitive') && options.hasOwnProperty('caseSensitive')) {
                    suggestionList.caseSensitive = options.caseSensitive;
                }

                this.suggestionLists[i] = new SuggestionList(suggestionList);
            }
        }

        events: {
            var self = this;
            var activeSuggestionList = null;
            var handledInKeyDown = false;

            this.onBlurHandler = function () {
                self.dropdown.hide();
            };

            this.onKeyDownHandler = function (e) {
                if (self.dropdown.isActive) {
                    var preventDefaultAction = function preventDefaultAction() {
                        e.preventDefault();
                        handledInKeyDown = true;
                    };

                    if (e.keyCode === 13 || e.keyCode === 9) {
                        setValue({
                            element: this,
                            trigger: activeSuggestionList.trigger,
                            suggestion: self.dropdown.getValue(),
                            onChange: self.onChange.bind(this)
                        });
                        self.dropdown.hide();
                        return preventDefaultAction();
                    } else if (e.keyCode === 40) {
                        self.dropdown.selectNext();
                        return preventDefaultAction();
                    } else if (e.keyCode === 38) {
                        self.dropdown.selectPrev();
                        return preventDefaultAction();
                    } else if (e.keyCode === 27) {
                        self.dropdown.hide();
                        return preventDefaultAction();
                    }
                }
            };

            var keyUpIndex = 0;
            this.onKeyUpHandler = function (e) {
                var _this = this;

                if (handledInKeyDown) {
                    handledInKeyDown = false;
                    return;
                }

                var value = void 0;
                if (data(this, 'isInput')) {
                    var _getCursorPosition5 = getCursorPosition(this),
                        _getCursorPosition6 = slicedToArray(_getCursorPosition5, 2),
                        startPosition = _getCursorPosition6[0],
                        endPosition = _getCursorPosition6[1];

                    if (/\w/.test(this.value.charAt(endPosition) || ' ')) {
                        self.dropdown.hide();
                        return;
                    }

                    value = this.value.slice(0, startPosition);
                } else {
                    var _getSelectedTextNodes3 = getSelectedTextNodes(),
                        startContainer = _getSelectedTextNodes3.startContainer,
                        startOffset = _getSelectedTextNodes3.startOffset,
                        endContainer = _getSelectedTextNodes3.endContainer,
                        endOffset = _getSelectedTextNodes3.endOffset;

                    if (!startContainer || !endContainer || !startContainer.nodeValue || /\w/.test((endContainer.nodeValue || '').charAt(endOffset) || ' ')) {
                        self.dropdown.hide();
                        return;
                    }

                    value = startContainer.nodeValue.slice(0, startOffset);
                }

                handleDropdown: {
                    keyUpIndex++;
                    self.dropdown.empty();

                    var executeQueue = makeAsyncQueueRunner();
                    var _i = 0,
                        timer = void 0,
                        triggerMatchFound = false;
                    self.suggestionLists.forEach(function (suggestionList) {
                        if (suggestionList.regex.test(value)) {
                            triggerMatchFound = true;

                            (function (i, asyncReference) {
                                var match = suggestionList.getMatch(value);
                                var caretPosition = getCaretPosition(_this, suggestionList.trigger);

                                if (self.dropdown.isEmpty) {
                                    timer && clearTimeout(timer);
                                    timer = setTimeout(function () {
                                        self.dropdown.showLoader(caretPosition);
                                    }, 0);
                                }

                                suggestionList.getSuggestions.call(_this, match, function (results) {
                                    if (asyncReference !== keyUpIndex) return;

                                    executeQueue(function () {
                                        timer && clearTimeout(timer);
                                        if (self.dropdown.isEmpty) {
                                            if (results.length) {
                                                activeSuggestionList = suggestionList;
                                                self.dropdown.fill(results.slice(0, self.maxSuggestions), function (suggestion) {
                                                    setValue({
                                                        element: _this,
                                                        trigger: suggestionList.trigger,
                                                        suggestion: suggestion,
                                                        onChange: self.onChange.bind(_this)
                                                    });
                                                });

                                                self.dropdown.show(caretPosition);
                                            } else {
                                                self.dropdown.hide();
                                            }
                                        }
                                    }, i);
                                });
                            })(_i++, keyUpIndex);
                        }
                    });

                    if (!triggerMatchFound) {
                        self.dropdown.hide();
                    }
                }
            };
        }

        // initialize events on inputs

        for (var _len2 = arguments.length, inputs = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            inputs[_key2 - 1] = arguments[_key2];
        }

        this.addInputs.apply(this, inputs);
    }

    createClass(AutoSuggest, [{
        key: 'addInputs',
        value: function addInputs() {
            var _this2 = this;

            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
            }

            var inputs = Array.prototype.concat.apply([], args.map(function (d) {
                return d[0] ? Array.prototype.slice.call(d, 0) : d;
            }));

            inputs.forEach(function (input) {
                // validate element
                if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT' && input.type === 'text') {
                    data(input, 'isInput', true);
                } else if (input.isContentEditable) {
                    data(input, 'isInput', false);
                } else {
                    throw new Error('AutoSuggest: Invalid input: only input[type = text], textarea and contenteditable elements are supported');
                }

                // init events
                input.addEventListener('blur', _this2.onBlurHandler);
                input.addEventListener('keyup', _this2.onKeyUpHandler);
                input.addEventListener('mouseup', _this2.onKeyUpHandler);
                input.addEventListener('keydown', _this2.onKeyDownHandler, true);

                data(input, 'index', _this2.inputs.push(input) - 1);
            });
        }
    }, {
        key: 'removeInputs',
        value: function removeInputs() {
            var _this3 = this;

            for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                args[_key4] = arguments[_key4];
            }

            var inputs = Array.prototype.concat.apply([], args.map(function (d) {
                return d[0] ? Array.prototype.slice.call(d, 0) : d;
            }));

            inputs.forEach(function (input) {
                var index = data(input, 'index');
                if (!isNaN(index)) {
                    _this3.inputs.splice(index, 1);

                    // destroy events
                    input.removeEventListener('blur', _this3.onBlurHandler);
                    input.removeEventListener('keyup', _this3.onKeyUpHandler);
                    input.removeEventListener('mouseup', _this3.onKeyUpHandler);
                    input.removeEventListener('keydown', _this3.onKeyDownHandler, true);
                }
            });
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.removeInputs(this.inputs);
        }
    }]);
    return AutoSuggest;
}();

return AutoSuggest;

})));
//# sourceMappingURL=AutoSuggest.js.map
