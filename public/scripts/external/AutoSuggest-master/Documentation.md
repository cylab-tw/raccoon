# Documentation
### Installation
*As npm module*
```bash
npm i @avcs/autosuggest --save
```

*As bower component*
```bash
bower install avcs-autosuggest --save
```

*As standalone JavaScript plugin*
```html
<script type="text/javascript" src="@avcs/autosuggest/dist/AutoSuggest.js"></script>
```

## AutoSuggest
### Initialization
```javascript
// uncomment next line if using as npm module
// import AutoSuggest from '@avcs/autosuggest';
var instance = new AutoSuggest(options, ...inputFields);
```

### Options
**`caseSensitive`**: `Boolean` *(default: `false`)*  
Setting it to `true` will show suggestions only if the case of search value matches the case of suggestion.

**`maxSuggestions`**: `Number` *(default: `10`)*  
Maximum number of suggestions to be shown in the dropdown, suggestions will be taken from the top of SuggestionList.

**`onChange`**: `Function<element, Suggestion>` *(optional)*

**`suggestions`**: `Array<SuggestionList | Object<Options for SuggestionList>>` *(default: `[]`)*

### Methods
**`addInputs`**: `Function<...inputFields<DOMElement | Array<DOMELement> | Iterable<DOMElement>>`  
Enable the autosuggest on new input fields after the instantiation.

**`removeInputs`**: `Function<...inputFields<DOMElement | Array<DOMELement> | Iterable<DOMElement>>`  
Disable the autosuggest on the input fields.

**`destroy`**: `Function<>`  
Disable autosuggest on all input fields.

## SuggestionList
### Initialization
```javascript
// uncomment next line if using as npm module
// import SuggestionList from '@avcs/autosuggest/es/SuggestionList';
var suggestionList = new SuggestionList(options);
```

### Options
**`trigger`**: `String | undefined` *(default: `undefined`)*  
This SuggestionList will be activated on typing the trigger, all the text typed after trigger is used as `keyword` for matching suggestions. If trigger is undefined, space is considered as trigger.

**`caseSensitive`**: `Boolean` *(default: `false`)*  
This will overwrite the `caseSensitive` option from `AutoSuggest`

**`values`**: `Array<Suggestion> | Function<keyword: String, callback: Function<Array<Suggestion>>>` *required*

## Suggestion 
### Suggestion as Object
**`on`**: `Array<String> | String`  
These are the values used for matching, if the search value matches any of these values, this Suggestion will be shown in suggestions.

**`show`**: `String`  
This value will be shown in the dropdown. (supports HTML)

**`insertText`**: `String`  
This value will be inserted into the place of trigger and keyword as is.
> If there is no `insertText`, `insertHtml` will be used as a string in case of input and textarea elements.

**`insertHtml`**: `String`  
This value will be inserted into the place of trigger and keyword as Html Element.
> If there is no `insertHtml`, `insertText` will be used in case of contenteditable.

**`focusText`**: `[StartIndex, EndIndex]`  
StartIndex and EndIndex of the content that should be in focus after inserting the text. As of now these indexes should be calculated as `(0 - numberOfCharactersFromEnd)`

**`focusHtml`**: `[StartIndex, EndIndex]`  
StartIndex and EndIndex of the content that should be in focus after inserting the HTML. As of now these indexes should be calculated as `(0 - numberOfCharactersFromEnd)`. This should not include the characters from HTML tags

**`value`**: `string`  
This will be used in the place of missing `on`, `show` and `insertText` values

### Suggestion as String
If Suggestion is passed as string it will be converted into following Suggestion object
```javascript
{
    on: [suggestion],
    show: suggestion,
    insertText: suggestion
}
```
