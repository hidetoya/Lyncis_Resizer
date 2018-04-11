# Lyncis Resizer

It resizes the browser window to the specified position and size, or open it to the specified position and size.
You click on the browser icon to open a popup window. The function of each button is as follows.

* \[Info\]: Get the position and size in the current window, and put it into the text area.
* \[Update\]: Apply to this window the position and size in the text area.
* \[Open\]: Open new window in the position and size in the text area.
* \[Clear\]: Clear the text area.
* \[Set\]: Set the registered position and size in the text area.
* \[Add\]: Add the position and size in the text area as the named presets.  If you click with pressing the ALT key, you can remove the presets.

## Properties
Write it in the form '{ property : value , ...}'. Property names are enclosed in double quotes and others are not.

### "left": Number
The offset of the window from the left edge of the screen in pixels. 

### "top": Number
The offset of the window from the top edge of the screen in pixels. 

### "width": Number
The width of the window, including the frame, in pixels. 

### "height": Number
The height of the window, including the frame, in pixels. 

### "url": "String"
A URL to open as tabs in the window.
It seems that it does not work well with the \[Update\] button (Maybe it is a specification).

### "exec": "String" - Action when pressing preset \[Set\] button
You can apply preset registered by one click. "update" applies to the current window. "open" applies to new windows. If there is no property, call up the preset in the text area.

### import: preset data - Import presets.
Use the exported preset data. You must close the popup once after pressing the \[Update\] button.

### reset: - Initialize all presets.
You must close the popup once after pressing the \[Update\] button.

### export: - Export all presets.
Preset data will be output immediately after pressing the \[Update\] button. You must Copy and save it.
