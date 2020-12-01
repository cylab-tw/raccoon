# AutoSuggest
A JavaScript plugin to implement IDE like autocompletion in input, textarea or contenteditable fields.

### [Demo](https://avcs.pro/autosuggest) | [Documentation](Documentation.md)

# Features
### General
1. Supports input, textarea and contenteditable fields
2. No external dependencies like jquery or bootstrap
3. Can add and remove inputs dynamically.

### Trigger
1. Can use any character or any sequence of characters as a trigger.
2. If no trigger is passed will use space as a trigger.
3. Trigger character will also be removed when inserting a suggestion except for the above case.

### Suggestions
1. Can supply an array of strings as [Suggestions](Documentation.md#suggestion-as-string).
2. Can supply an array of objects as [Suggestions](Documentation.md#suggestion-as-object) to get fine control over the behavior of suggestions.
3. Can pass HTML inside `Suggestion.show` if you want to design how the suggestion is shown in the dropdown.
4. Can pass HTML in `Suggestion.insertText` if you want to show HTML as is in the contenteditable fields.
5. Can pass HTML in `Suggestion.insertHTML` if you want to insert HTML as evaluated DOM elements in contenteditable fields.
6. Can pass a `Function` in [SuggestionList.values](Documentation.md#suggestionlist) which will receive the keyword and generates [Suggestions](Documentation.md#suggestion) dynamically.
    - Supports `Async` allowing you to fetch suggestions over API calls, shows a loader until the callback is executed.
    - By default the plugin matches all suggestions that starts with keyword, if you want more control over matching, like fuzzy search, you can use `Function` to plug the behavior into the plugin.

### Dropdown
1. Current scroll states are considered when calculating the position of dropdown.
2. Considers `line-height` of the trigger character (height in case of input) to determine the position of dropdown.
3. Can use `Up` and `Down` arrows to navigate between multiple suggestions when dropdown is active
4. Can use `Enter` or `Tab` key to insert the current selected Suggestion in the dropdown
5. Can use `Esc` key to close the dropdown.
6. Dropdown will be shown on keydown or mousedown inside the input field, when the value before the current selection ends with "trigger + keyword" (without spaces) and the immediate character after the selection does not belong to `a-zA-Z0-9_` (Anything inside the selection will not be considered inside keyword)
7. In case of contenteditable, if the selection spans over multiple nodes with different styles, the suggestion will be inserted into the first node, hence follows the style of the first node.
