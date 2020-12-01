import {
    data,
    getGlobalOffset,
    getCursorPosition,
    getScrollLeftForInput,
    makeAsyncQueueRunner,
    getSelectedTextNodes,
    getComputedStyle,
    getFirstChildNode
} from './Utilities';
import {
    CLONE_PROPERTIES
} from './Constants';

import SuggestionList from './SuggestionList';
import SuggestionDropdown from './SuggestionDropdown';

function splitValue(originalValue, cursorPosition, trigger) {
    const value = originalValue.slice(0, cursorPosition);
    let textAfterTrigger = value.split(trigger || /\W/).pop();
    const textUptoTrigger = textAfterTrigger.length ? value.slice(0, 0 - textAfterTrigger.length) : value;
    textAfterTrigger += originalValue.slice(cursorPosition);
    return { textAfterTrigger, textUptoTrigger };
}

function getCharHeight(...elements) {
    return Math.max(...elements.map(element => (
        parseFloat(getComputedStyle(element, 'line-height'))
    )));
}

// Invisible character
const POSITIONER_CHARACTER = "\ufeff";
function getCaretPosition(element, trigger) {
    if (data(element, 'isInput')) {
        const [cursorPosition] = getCursorPosition(element);
        const { textAfterTrigger, textUptoTrigger } = splitValue(element.value, cursorPosition, trigger);

        // pre to retain special characters
        const clone = document.createElement('pre');
        clone.id = 'autosuggest-positionclone';

        const positioner = document.createElement('span');
        positioner.appendChild(document.createTextNode(POSITIONER_CHARACTER));

        const computed = window.getComputedStyle(element);
        CLONE_PROPERTIES.forEach(prop => {
            clone.style[prop] = computed[prop];
        });

        const elementPosition = getGlobalOffset(element);
        clone.style.opacity = 0;
        clone.style.position = 'absolute';
        clone.style.top = `${elementPosition.top}px`;
        clone.style.left = `${elementPosition.left}px`;
        document.body.appendChild(clone);

        if (element.scrollHeight > parseInt(computed.height)) {
            clone.style.overflowY = 'scroll';
        } else {
            clone.style.overflow = 'hidden';
        }

        // Extra styles for the clone depending on type of input
        let charHeight;
        if (element.tagName === 'INPUT') {
            clone.appendChild(document.createTextNode(textUptoTrigger.replace(/ /g, '\u00A0')));
            clone.appendChild(positioner);
            clone.appendChild(document.createTextNode(textAfterTrigger.replace(/ /g, '\u00A0')));

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

        const caretPosition = getGlobalOffset(positioner);
        const inputPosition = getGlobalOffset(element);

        caretPosition.top += charHeight - clone.scrollTop;
        caretPosition.left -= clone.scrollLeft;

        const diff = caretPosition.left - inputPosition.left;
        if (diff < 0 || diff > element.clientWidth)
            caretPosition.left = inputPosition.left;

        document.body.removeChild(clone);
        return caretPosition;
    } else {
        const { startContainer, startOffset, endContainer, endOffset } = window.getSelection().getRangeAt(0);
        const { startContainer: containerTextNode, startOffset: cursorPosition, direction } = getSelectedTextNodes();
        const { textAfterTrigger, textUptoTrigger } = splitValue(containerTextNode.nodeValue, cursorPosition, trigger);

        const parentNode = containerTextNode.parentNode;
        const referenceNode = containerTextNode.nextSibling;

        const positioner = document.createElement("span");
        positioner.appendChild(document.createTextNode(POSITIONER_CHARACTER));
        parentNode.insertBefore(positioner, referenceNode);

        if (textAfterTrigger) {
            containerTextNode.nodeValue = textUptoTrigger;
            const remainingTextNode = document.createTextNode(textAfterTrigger);
            parentNode.insertBefore(remainingTextNode, referenceNode);
        }

        const caretPosition = getGlobalOffset(positioner);
        const charHeight = getCharHeight(positioner);
        caretPosition.top += charHeight;

        // Reset DOM to the state before changes
        parentNode.removeChild(positioner);
        if (textAfterTrigger) {
            parentNode.removeChild(containerTextNode.nextSibling);
            containerTextNode.nodeValue = textUptoTrigger + textAfterTrigger;
        }

        const selection = window.getSelection();
        if (selection.setBaseAndExtent) {
            if (direction) {
                selection.setBaseAndExtent(startContainer, startOffset, endContainer, endOffset);
            } else {
                selection.setBaseAndExtent(endContainer, endOffset, startContainer, startOffset);
            }
        } else {
            const range = document.createRange();
            range.setStart(startContainer, startOffset);
            range.setEnd(endContainer, endOffset);
            selection.removeAllRanges();
            selection.addRange(range)
        }

        return caretPosition;
    }
}

const getNextNode = (node, root) => {
    let nextNode;
    if (node.nextSibling)
        nextNode = node.nextSibling;
    else {
        nextNode = node.parentNode;
        while (nextNode && nextNode !== root && !nextNode.nextSibling)
            nextNode = nextNode.parentNode;
        if (nextNode && nextNode !== root)
            nextNode = nextNode.nextSibling
        else return;
    }

    return getFirstChildNode(nextNode);
};

const removeNodesBetween = (startContainer, endContainer) => {
    if (startContainer === endContainer) return;
    let node = getNextNode(startContainer);
    while (node !== endContainer) {
        node.parentNode.removeChild(node);
        node = getNextNode(startContainer);
    }
};

const insertHtmlAfter = (node, html) => {
    const psuedoDom = document.createElement('div');
    psuedoDom.innerHTML = html;

    const referenceNode = node.nextSibling;
    const appendedNodes = [];
    while (psuedoDom.firstChild) {
        appendedNodes.push(psuedoDom.firstChild);
        node.parentNode.insertBefore(psuedoDom.firstChild, referenceNode);
    }

    return appendedNodes;
};

const setValue = ({ element, trigger, suggestion, onChange }) => {
    if (data(element, 'isInput')) {
        const [startPosition, endPosition] = getCursorPosition(element);
        const originalValue = element.value;

        let value = originalValue.slice(0, startPosition);
        const currentValue = value.split(trigger || /\W/).pop();
        value = value.slice(0, 0 - currentValue.length - (trigger || '').length) + (suggestion.insertText || suggestion.insertHtml);
        element.value = value + originalValue.slice(endPosition);
        element.focus();

        const focus = suggestion.insertText ? suggestion.focusText : [0, 0];
        const cursorStartPosition = value.length;
        element.setSelectionRange(cursorStartPosition + focus[0], cursorStartPosition + focus[1]);
    } else {
        const { startContainer, startOffset, endContainer, endOffset } = getSelectedTextNodes();
        const selection = window.getSelection();
        const range = document.createRange();

        let preValue = startContainer.nodeValue.slice(0, startOffset);
        const replaceValue = preValue.split(trigger || /\W/).pop();
        preValue = preValue.slice(0, 0 - replaceValue.length - (trigger || '').length);

        if (startContainer !== endContainer) {
            startContainer.nodeValue = preValue;
            removeNodesBetween(startContainer, endContainer);
            if (endContainer.nodeValue) {
                endContainer.nodeValue = endContainer.nodeValue.slice(endOffset);
            }
        } else {
            const remainingText = startContainer.nodeValue.slice(endOffset);
            if (remainingText) {
                const remainingTextNode = document.createTextNode(remainingText);
                startContainer.parentNode.insertBefore(remainingTextNode, startContainer.nextSibling);
            }
            startContainer.nodeValue = preValue;
        }

        if (suggestion.insertHtml) {
            const nodes = insertHtmlAfter(startContainer, suggestion.insertHtml);
            const focus = nodes.length ? suggestion.focusHtml : [0, 0];

            function setSelection(focus, nodes, method) {
                let lastNode, lastFocus = focus;
                if (lastFocus !== 0) {
                    do {
                        lastNode = nodes.pop();
                        lastFocus += lastNode.textContent.length;
                    } while(nodes.length && lastFocus < 0);

                    if (!lastNode) {
                        throw new TypeError(`AutoSuggest: Invalid value provided for Suggestion.focusHtml`);
                    };
                }

                if (lastFocus === 0) {
                    range[method + 'After'](nodes[nodes.length - 1] || startContainer);
                } else {
                    if (lastNode.nodeType === lastNode.TEXT_NODE) {
                        range[method](lastNode, lastFocus);
                    } else {
                        setSelection(
                            lastFocus - lastNode.textContent.length,
                            Array.prototype.slice.call(lastNode.childNodes, 0),
                            method
                        );
                    }
                }
            };

            setSelection(focus[1], [...nodes], 'setEnd');
            setSelection(focus[0], [...nodes], 'setStart');
        } else {
            startContainer.nodeValue += suggestion.insertText;
            const focus = suggestion.focusText;
            const cursorStartPosition = startContainer.nodeValue.length;

            range.setStart(startContainer, cursorStartPosition + focus[0]);
            range.setEnd(startContainer, cursorStartPosition + focus[1]);
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    onChange(suggestion);
};

class AutoSuggest {
    constructor(options, ...inputs) {
        if (!options) {
            throw new Error(`AutoSuggest: Missing required parameter, options`);
        }

        this.inputs = [];
        this.dropdown = new SuggestionDropdown();
        this.onChange = options.onChange || Function.prototype;
        this.maxSuggestions = options.maxSuggestions || 10;

        // validate suggestions
        this.suggestionLists = options.suggestions || [];
        for (let i = 0; i < this.suggestionLists.length; i++) {
            let suggestionList = this.suggestionLists[i];
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
            const self = this;
            let activeSuggestionList = null;
            let handledInKeyDown = false;

            this.onBlurHandler = function() {
                self.dropdown.hide();
            };

            this.onKeyDownHandler = function(e) {
                if (self.dropdown.isActive) {
                    const preventDefaultAction = () => {
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

            let keyUpIndex = 0;
            this.onKeyUpHandler = function(e) {
                if (handledInKeyDown) {
                    handledInKeyDown = false;
                    return;
                }

                let value;
                if (data(this, 'isInput')) {
                    const [startPosition, endPosition] = getCursorPosition(this);
                    if (/\w/.test(this.value.charAt(endPosition) || ' ')) {
                        self.dropdown.hide();
                        return;
                    }

                    value = this.value.slice(0, startPosition);
                } else {
                    const { startContainer, startOffset, endContainer, endOffset } = getSelectedTextNodes();
                    if (!startContainer || !endContainer || !startContainer.nodeValue ||
                        /\w/.test((endContainer.nodeValue || '').charAt(endOffset) || ' ')) {
                        self.dropdown.hide();
                        return;
                    }

                    value = startContainer.nodeValue.slice(0, startOffset);
                }

                handleDropdown: {
                    keyUpIndex++;
                    self.dropdown.empty();

                    const executeQueue = makeAsyncQueueRunner();
                    let i = 0, timer, triggerMatchFound = false;
                    self.suggestionLists.forEach(suggestionList => {
                        if (suggestionList.regex.test(value)) {
                            triggerMatchFound = true;

                            ((i, asyncReference) => {
                                const match = suggestionList.getMatch(value);
                                const caretPosition = getCaretPosition(this, suggestionList.trigger);

                                if (self.dropdown.isEmpty) {
                                    timer && clearTimeout(timer);
                                    timer = setTimeout(() => {
                                        self.dropdown.showLoader(caretPosition);
                                    }, 0);
                                }

                                suggestionList.getSuggestions.call(this, match, results => {
                                    if (asyncReference !== keyUpIndex) return;

                                    executeQueue(() => {
                                        timer && clearTimeout(timer);
                                        if (self.dropdown.isEmpty) {
                                            if (results.length) {
                                                activeSuggestionList = suggestionList;
                                                self.dropdown.fill(
                                                    results.slice(0, self.maxSuggestions),
                                                    suggestion => {
                                                        setValue({
                                                            element: this,
                                                            trigger: suggestionList.trigger,
                                                            suggestion: suggestion,
                                                            onChange: self.onChange.bind(this)
                                                        });
                                                    }
                                                );

                                                self.dropdown.show(caretPosition);
                                            } else {
                                                self.dropdown.hide();
                                            }
                                        }
                                    }, i);
                                });
                            })(i++, keyUpIndex);
                        }
                    });

                    if (!triggerMatchFound) {
                        self.dropdown.hide();
                    }
                }
            };
        }

        // initialize events on inputs
        this.addInputs(...inputs);
    }

    addInputs(...args) {
        const inputs = Array.prototype.concat.apply([], args.map(d => d[0] ? Array.prototype.slice.call(d, 0) : d));

        inputs.forEach(input => {
            // validate element
            if (input.tagName === 'TEXTAREA' || (input.tagName === 'INPUT' && input.type === 'text')) {
                data(input, 'isInput', true)
            } else if (input.isContentEditable) {
                data(input, 'isInput', false)
            } else {
                throw new Error('AutoSuggest: Invalid input: only input[type = text], textarea and contenteditable elements are supported');
            }

            // init events
            input.addEventListener('blur', this.onBlurHandler);
            input.addEventListener('keyup', this.onKeyUpHandler);
            input.addEventListener('mouseup', this.onKeyUpHandler);
            input.addEventListener('keydown', this.onKeyDownHandler, true);

            data(input, 'index', this.inputs.push(input) - 1);
        });
    }

    removeInputs(...args) {
        const inputs = Array.prototype.concat.apply([], args.map(d => d[0] ? Array.prototype.slice.call(d, 0) : d));

        inputs.forEach(input => {
            const index = data(input, 'index');
            if (!isNaN(index)) {
                this.inputs.splice(index, 1);

                // destroy events
                input.removeEventListener('blur', this.onBlurHandler);
                input.removeEventListener('keyup', this.onKeyUpHandler);
                input.removeEventListener('mouseup', this.onKeyUpHandler);
                input.removeEventListener('keydown', this.onKeyDownHandler, true);
            }
        });
    }

    destroy() {
        this.removeInputs(this.inputs);
    }
}

export default AutoSuggest;
