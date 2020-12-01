# 1. Trigger character + String Values
```
SuggestionList { trigger: '#', values: ['hello', 'world'] };
```
1. Should show both the values on typing `#`
2. Should show only "hello" value on typing `h`
3. Should ignore case, should show "hello" on typing `H`
4. Should show dropdown on selecting multiple characters, type `he` and select both the characters
5. Should not show dropdown when the next character after the cursor belongs to [a-zA-Z0-9_], type `he`and move the cursor between `h` and `e`
6. Above rule should be applied when selecting multiple characters too, type `hel` and select `he`
7. When dropdown is being shown, `enter` or `tab` key should replace the "trigger + keyword" with the value of suggestion highlighted.
8. The inserted value should not contain `#` as it is not part of the value
9. If the input being edited is scrolled in any direction, position of the dropdown should still work normally
10. All the above test cases should pass for all three types of input fields input, textares and contenteditable
11. Vertical position of the dropdown sholuld be right below the keyword except for input where it will be right below the input box.
12. All of the above conditions should hold if trigger character is changed to `##`
13. When dropdown is being shown, `up` and `down` arrow keys should update the highlighted value in the dropdown.
    ```
    up => prev || last
    down => next || first
14. When dropdown is being shown, `esc` key should close the dropdown.
    ```
15. When dropdown is being shown, `up`, `down`, `enter`, `tab` and `esc` keys should not implement their default behavior

... to be continued
