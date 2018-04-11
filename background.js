console.log("This is background page(<background.js>).");

chrome.runtime.onMessage.addListener(
	function(message, sender, sendResponse) {
		if(message.cmd==="log"){
			console.log(...message.args);
			//^ スプレッド演算子; 配列類似のargumentsオブジェクトを展開
		}//if log
	}//f.
);//.onMessage.addListener
