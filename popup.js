//◆バックグラウンドページへ
/* globals bg:true */
window.bg={
  log:function(){
		chrome.runtime.sendMessage({cmd:"log", args:Array.from(arguments)});
		//^ argumentsオブジェクトをArrayに
	}//f.log
};//obj.bg

//◆グローバル変数の初期値設定
/* globals presets2:true */
/* globals PSOrder:true */
window.presets2 = {
	//"title":"string"
};
window.PSOrder = [];

//◆ロケールデータのセット
function setLocales(){
	let elms=document.getElementsByClassName("locales");
	for(let el of elms){
		let msg = chrome.i18n.getMessage(el.id);
		el.textContent=msg;
	}
}//f.setLocales

/* globals InitialData:true */

//初期データ (ストアデータと同形式)《大文字に注意》
InitialData = {
		"PSOrder": ["640x480", "800x600", "1024x768"]
	, "backgroundColor":"#f0f0f0"
	, "fontSize":"12px"
	,	"ps_640x480": '{"left":10,"top":10,"width":640,"height":480}'
	,	"ps_800x600": '{"left":10,"top":10,"width":800,"height":600}'
	,	"ps_1024x768": '{"left":10,"top":10,"width":1024,"height":768}'
}; //InitialData

//◆初期データの設定
function initialize(initialData) {

	//初期データをグローバル変数presets2,PSOrderに変換
	let keys = Object.keys(initialData);
	for (let i = 0; i < keys.length; i++) {
		let title;
		if (keys[i].startsWith("ps_")) {
			title = keys[i].substr(3);
			presets2[title] = initialData["ps_" + title];

			//ストアデータに保存
			let setobj = {};
			setobj["ps_" + title] = initialData["ps_" + title];
			chrome.storage.local.set(setobj);
		}
	} //for

	if(initialData.PSOrder) PSOrder = initialData.PSOrder;
	chrome.storage.local.set({"PSOrder": PSOrder});

	// bgcolor and fontsize
	chrome.storage.local.set({
		  "backgroundColor": initialData.backgroundColor
		, "fontSize": initialData.fontSize
	});

	//ログ
	bg.log("initialize : presets2",presets2);
	bg.log("initialize : PSOrder",PSOrder);
	//ストアデータ読込(テスト)
	chrome.storage.local.get(null,function(allitems){
		bg.log("initialize : allitems from storage");
		bg.log(allitems);
	});//.get

	//グローバル変数のクリア
	// ∵ストアデータから再現するため
	presets2 = {};
	PSOrder = [];
} //f.initialize

//◆現在のウィンドウ情報を出力
function putInfo() {
	let myta = document.getElementById("myta");
	myta.classList.remove("error"); //clear
	chrome.windows.getCurrent(null, function (w) {
		let myta = document.getElementById("myta");
		myta.value = `{"left":${w.left}, "top":${w.top}, "width":${w.width}, "height":${w.height}}`;
	});
} //f.putInfo

//◆新規ウィンドウに適用
function applyNewWindow() {
	let myta = document.getElementById("myta");
	let order;
	myta.classList.remove("error"); //clear

	try {
		order = JSON.parse(myta.value);
	} catch (e) {
		myta.classList.add("error");
		bg.log("Parse error: invalid JSON");
		return;
	}
	
	delete order.exec; //execプロパティがあれば削除
	chrome.windows.create(order);
} //f.applyNewWindow

//◆現在のウィンドウに適用
function applyThisWindow() {
	let myta = document.getElementById("myta");
	let order;
	myta.classList.remove("error"); //clear

	//backgroundColor:
	//* TODO ストレージ保存,書式チェック
	//* example white,#ffffcc(薄い黄色)
	//* example Browsizer
	//		body bgcolor: rgb(240,240,240) = #f0f0f0
	//		button bgcolor: rgb(225,225,225)
	if(myta.value.match(/^\s*backgroundColor\s*:/)){
		setBgColor(myta.value);
		return;
	}

	//fontSize:
	if(myta.value.match(/^\s*fontSize\s*:/)){
		setFontSize(myta.value);
		return;
	}

	//about:
	if(myta.value.match(/^\s*about\s*:/)){
		let v=chrome.runtime.getManifest().version;
		myta.value = "Lyncis Resizer - "
			+ "version "+v+"\n"
			+ "Copyright (c) hidetoya"
		;
		return;
	}//if

	//import:
	if(myta.value.match(/^\s*import\s*:/)){
		importPresets(myta);
		return;
	}
	
	//reset:
	if(myta.value.match(/^\s*reset\s*:/)){
		resetData();
		return;
	}
	
	//export:
	if(myta.value.match(/^\s*export\s*:/)){
		exportPresets(myta);
		return;
	}

	//default: {...}
	try {
		order = JSON.parse(myta.value);
	} catch (e) {
		myta.classList.add("error");
		bg.log("Parse error:invalid JSON");
		return;
	}
	delete order.exec; //execプロパティがあれば削除
	order.focused = true;
	chrome.windows.getCurrent(null, function (w) {
		bg.log("chrome.windows.getCurrent:",w.id);
		chrome.windows.update(w.id, order);
	});
} //f.applyThisWindow

//◆リセット
function resetData(){
	//ストアデータのクリア
	chrome.storage.local.clear();
}//f.resetData

//◆エクスポート
function exportPresets(myta){
	chrome.storage.local.get(["backgroundColor","fontSize"], function(items){
		let obj = {
			  "PSOrder": PSOrder
			, "backgroundColor": items.backgroundColor
			, "fontSize": items.fontSize
		};//プロパティの並び順は定義した順のようだ ココ重要
		for(let key of PSOrder){
			obj["ps_"+key]=presets2[key];
		}
		let txt = JSON.stringify(obj);
		txt = txt
			.replace(/:"\{/g,":'{")
			.replace(/\}"/g,"}'")
			.replace(/\\"/g,'"')
		;//^ 外側のダブル引用符をシングル引用符にして内側のエスケープを除去
		myta.value = txt;
	});//storage..get f.

}//f.exportsPresets

//◆インポート
function importPresets(myta){
	let obj=parseImportData(myta.value);
	//^ InitialData形式またはエラー番号で戻す
	
	if(0<obj) {
		myta.classList.add("error");
		bg.log("Import error: Import was canceled.");
		return;
	}
	initialize(obj); //データの初期化
	return;
}//f.importPresets

//◆インポートデータのパース
function parseImportData(itxt){
	//console.log(itxt);

	//正規表現による定義
	//^ バックスラッシュのエスケープに注意。また読みやすくするため、空白と「(#」に特別な意味を持たせたので注意
	const baseD = ` import : \\{ body\\} `;
	const bodyD = `psorder (#:, bgcolor)? (#:, fontsize )? , presets (?:, presets )*`; //#:$2 $3
	const bgcolorD = `"backgroundColor" : dquo`;
	const fontsizeD = `"fontSize" : dquo`;
	const psorderD = `(?:PSOrder|"PSOrder") : pso_arr`;
	const pso_arrD = `\\[ (#:dquo (?:, dquo)*) \\]`; //#:$1
	const presetsD=`"(#:ps_[^"]+)" : (#:squo|dquo)`;
	//^ #:$4 $5 $6 $7 量指定子「*」でマッチする部分が増えても参照番号は増えない。$6 $7には最後にマッチする部分が代入されるようだ
	const dquoD=`"(?:[^"]+)"`;
	//^ エスケープ「\"」は別途考慮している
	const squoD=`'(?:[^']+)'`;

	//正規表現の構築
	let re=baseD;//文字列形式の正規表現
	re=re
		.replace(/body/,bodyD)
		.replace(/psorder/,psorderD)
		.replace(/bgcolor/,bgcolorD)
		.replace(/fontsize/,fontsizeD)
		.replace(/pso_arr/,pso_arrD)
		.replace(/presets/g,presetsD)
		.replace(/dquo/g,dquoD)
		.replace(/squo/g,squoD)
	;

	//正規表現による定義 (blank用)
	const bodyBD=`psorder (#:, bgcolor)? (#:, fontsize )? `; //#:$1 $2
	const pso_arrBD = `\\[ \\]`;
	
	//正規表現の構築 (blank用)
	let re_blank=baseD;
	re_blank=re_blank
		.replace(/body/,bodyBD)
		.replace(/psorder/,psorderD)
		.replace(/bgcolor/,bgcolorD)
		.replace(/fontsize/,fontsizeD)
		.replace(/pso_arr/,pso_arrBD)
		.replace(/dquo/g,dquoD)
	;

	//フリーフォーマット化
	re=re.replace(/ /g,"\\s*");
	re_blank=re_blank.replace(/ /g,"\\s*");

	//「(#:」の置換
	re=re.replace(/\(#:/g,"(");
	re_blank=re_blank.replace(/\(#:/g,"(");
	//^ 以上で基本構築終わり

///*
	//debug
	let re_debug0=re;
	let re_debugN=re.replace(/\((?!\?)/g,"#").replace(/[^#]/g,".");
	bg.log("//"+re_debug0+"\n//"+re_debugN);
	//\s*import\s*:\s*\{\s*(?:PSOrder|"PSOrder")\s*:\s*\[\s*("(?:[^"]+)"\s*(?:,\s*"(?:[^"]+)")*)\s*\]\s*(,\s*"backgroundColor"\s*:\s*"(?:[^"]+)")?\s*(,\s*"fontSize"\s*:\s*"(?:[^"]+)"\s*)?\s*,\s*"(ps_[^"]+)"\s*:\s*('(?:[^']+)'|"(?:[^"]+)")\s*(?:,\s*"(ps_[^"]+)"\s*:\s*('(?:[^']+)'|"(?:[^"]+)")\s*)*\}\s*
	//......................................................#...........................................#............................................#.............................................#.................#...................................#.................#..................................

//*/

	//文字列全体のマッチング -- results
	let rgex=new RegExp("^"+re+"$");
	let rgex_blank=new RegExp("^"+re_blank+"$");
	itxt=itxt.replace(/\\"/g,"\x1B"); //「\"」のエスケープ
	let results = itxt.match(rgex);
	//^ mオプションがないので 1行ごとではなく、文字列全体のマッチングとなる

	/* 結果の一例 ``で括ってある ()はblankの場合
	$1(--): `"640x480","800x600","1024x768"`
	---
	$2($1): `,"backgroundColor":"test1"` または undefined
	$3($2): `,"fontSize":"test2"↵`  または undefined
	--- 最初のプリセット
	$4: `ps_640x480`
	$5: `'{"left":10,"top":10,"width":640,"height":480}'`
	--- 最後のプリセット(2個以上の場合)
	$6: `ps_1024x768`
	$7: `'{"left":10,"top":10,"width":1024,"height":768}'`
	*/

	let bgColor;
	let fontSize;
	function refreshStylesData(bgColor,fontSize){
		if(!bgColor) bgColor=InitialData.backgroundColor;
		if(!fontSize) fontSize=InitialData.fontSize
		chrome.storage.local.set({"backgroundColor":bgColor});
		chrome.storage.local.set({"fontSize":fontSize});
	}

	if(!results) {
		let resultsB = itxt.match(rgex_blank);
		if(resultsB) {
			//blankプリセットの場合
			bg.log("Import: blank presets");
			//bgcolor and fontsize
			if(resultsB[1]){
				bgColor=resultsB[1].match(/:\s*"([^"]+)"/)[1];
			}
			if(resultsB[2]){
				fontSize=resultsB[2].match(/:\s*"([^"]+)"/)[1];
			}
			refreshStylesData(bgColor,fontSize);
			return { PSOrder: [] };
		} else {
			bg.log("Import error: Not match");
			return 1;
		}//if itxt.match(rgex_blank)
	}//if !results

	// bgcolor and fontsize
	if(results[2]){
		bgColor=results[2].match(/:\s*"([^"]+)"/)[1];
	}
	if(results[3]){
		fontSize=results[3].match(/:\s*"([^"]+)"/)[1];
	}
	refreshStylesData(bgColor,fontSize);

	//可変長部分のマッチ -- つまり 各presetsのマッチ
	let retval = { PSOrder: [] }; //戻り値用
	let pso = results[1].split(/\s*,\s*/);
	for(let i=0;i<pso.length;i++){
		let key = pso[i].replace(/"/g,''); //引用符の削除
		retval.PSOrder[i]=key; //保存
		let re = presetsD.replace('(#:ps_[^"]+)',"(ps_"+key+")");
		//^ 文字列として置換
		
		//フォールダウン置換で正規表現を構築
		re=re.replace(/dquo/g,dquoD)
			.replace(/squo/g,squoD)
			.replace(/ /g,"\\s*")
			.replace(/\(#:/g,"(")
		;
		
		let rgex=new RegExp(re);
		let part_variable = itxt.match(rgex);
		/* 結果の一例
		1: "ps_640x480"
		2: `'{"left":10,"top":10,"width":640,"height":480}'`
		*/
		if(!part_variable) {
			bg.log("Import error: Not match in part_variable");
			return 2;
		}
		let title=part_variable[1];
		let pstxt=part_variable[2].substr(1,part_variable[2].length-2); //引用符の除去
		pstxt=pstxt.replace(/\x1B/g,'"'); //「\"」のアンエスケープ
		bg.log(i+"\ntitle:<"+title+">\npstxt:<"+pstxt+">\n");
		retval[title]=pstxt; //保存
	}//for
	return retval;
}//f.parseImportData

//◆背景色の設定
function setBgColor(txt){
	let	r = txt.match(
		/^\s*backgroundColor\s*:\s*(\S.*)/
		//                         1    1
	);
	if(r){
		let val=r[1];
		let body=document.body;
		body.style.backgroundColor = val;
		//ストレージ保存
		chrome.storage.local.set({"backgroundColor":val});
		return;
	}//if
}//f.setBgColor

//◆フォントの設定
function setFontSize(txt){
	let	r = txt.match(
		/^\s*fontSize\s*:\s*(\S.*)/
		//                  1    1
	);
	if(r){
		let val=r[1];
		let newStyle=document.createElement("style");
		newStyle.id="setFontSize";
		newStyle.textContent
			= '\nbody, textarea, button, input{\n'
			+ 'font-size:'+val+' !important;\n'
			+ '}\n'
		;
		let insertedEl = document.getElementById("setFontSize");
		if(insertedEl){
			//#setFontSizeが挿入済
			document.body.replaceChild(newStyle,insertedEl);
		}else{
			//#setFontSizeが未挿入
			document.body.appendChild(newStyle);
		}//if insertedEl
		//ストレージ保存
		chrome.storage.local.set({"fontSize":val});
	}//if r
}//f.setFontSize

//◆テキストエリアのクリア
function clearTA() {
	let myta = document.getElementById("myta");
	myta.classList.remove("error"); //clear
	myta.value = "";
} //f.clearTA

//◆全プリセットの挿入・クリックイベント設定
function insertPresets() {
	//ログ
	//bg.log("presets2 in insertPreset");
	//bg.log(presets2);
	//bg.log(PSOrder);

	let ip = document.querySelector('#presets table>tbody');
	let btnSet=chrome.i18n.getMessage("btnSet");
	for (let i = PSOrder.length - 1; 0 <= i; i--) {
		let title = PSOrder[i];
/* Firefoxのアドオン審査で不合格になるので書き換え。メンテがしにくくなってしまった(;｡;)
		ip.insertAdjacentHTML("afterbegin", `
	<tr>
		<td class="name">${title}</td>
		<td class="button">
			<button class="btnSet" title="${title}">
			${btnSet}</button>
		</td>
	</tr>`);
*/
		(function alt_insertAdjacentHTML(){
			//BB/[AB]/BE/AE
			let tr=document.createElement("tr");

			let td1=document.createElement("td");
			td1.classList.add("name");
			td1.textContent=title;//サニタイズ？

			let td2=document.createElement("td");
			td2.classList.add("button");

			let button=document.createElement("button");
			button.classList.add("btnSet");
			button.title=title;//サニタイズ？
			button.textContent=btnSet;//サニタイズ？

			tr.appendChild(td1);
			tr.appendChild(td2);
			td2.appendChild(button);
			ip.insertBefore(tr,ip.firstElementChild);
		})();
	} //for

	//Setボタンのイベント設定
	let elms = document.querySelectorAll('#presets button.btnSet');
	for (let i = 0; i < elms.length; i++) {
		elms[i].addEventListener("click", function (ev) {
			let title=this.title; //サニタイズから復元？
			//既定処理
			let myta = document.getElementById("myta");
			myta.value = presets2[title];
			//execプロパティ 隠し機能 ワンクリックでオープン or リサイズ
			if(presets2[title].match(/"exec" *: *"open"/)){
				applyNewWindow();
				window.close(); //ポップアップを閉じる
			} else if(presets2[title].match(/"exec" *: *"update"/)){
				applyThisWindow();
				window.close(); //ポップアップを閉じる
			}
		}, false); //.addEventListener
	} //for
} //f.insertPresets

//◆プリセットの追加
function addPreset() {
	let myta = document.getElementById("myta");
	let title = document.getElementById("presetTitle").value;
	//既存タイトルの場合
	if(0<=PSOrder.indexOf(title)) return;
	myta.classList.remove("error"); //clear

	//パースチェック
	let parsed;
	try {
		parsed = JSON.parse(myta.value);
	} catch (e) {
		myta.classList.add("error");
		bg.log("Parse error:invalid JSON");
		return;
	}

	//グローバル変数に追加
	presets2[title] = parsed; //テキストとして追加
	PSOrder.push(title);

	//ストレージに保存
	(function () {
		let setobj = {};
		setobj["ps_" + title] = myta.value;
		chrome.storage.local.set(setobj);
		chrome.storage.local.set({
			"PSOrder": PSOrder
		});
	})();

	let btnSet=chrome.i18n.getMessage("btnSet");
	let ip = document.querySelector('#presets table>tbody');
	ip = ip.lastElementChild;

	//html要素を最後のTRの直前に追加
/* Firefoxのアドオン審査で不合格になるので書き換え。メンテがしにくくなってしまった(;｡;)
	ip.insertAdjacentHTML("beforebegin", `
<tr>
	<td class="name">${title}</td>
	<td class="button">
		<button class="btnSet" title="${title}">
		${btnSet}</button>
	</td>
</tr>`);
*/
	(function alt_insertAdjacentHTML(){
		//[BB]/AB/BE/AE
		let tr=document.createElement("tr");
		let td1=document.createElement("td");
		td1.classList.add("name");
		td1.textContent=title;//サニタイズ？
		let td2=document.createElement("td");
		td2.classList.add("button");
		let button=document.createElement("button");
		button.classList.add("btnSet");
		button.title=title;//サニタイズ？
		button.textContent=btnSet;//サニタイズ？
		tr.appendChild(td1);
		tr.appendChild(td2);
		td2.appendChild(button);
		ip.parentNode.insertBefore(tr,ip);
	})();

	ip = ip.previousElementSibling; //挿入されたTR
	ip = ip.getElementsByTagName("button")[0];
	ip.addEventListener("click", function (ev) {
		let myta = document.getElementById("myta");
		myta.value = presets2[this.title];
	}, false); //.addEventListener //イベントの追加
	document.getElementById("presetTitle").value = "";
} //f.addPreset

//◆プリセットの削除
function delPreset() {
	let title = document.getElementById("presetTitle").value;
	let psoindex = PSOrder.indexOf(title);
	if (psoindex < 0) return;

	//グローバル変数から削除
	delete presets2[title];
	PSOrder.splice(psoindex, 1);

	//ストレージから削除
	chrome.storage.local.remove("ps_" + title);
	chrome.storage.local.set({
		"PSOrder": PSOrder
	});

	//新版
	//let escapedTitle = escapeHTML(title); //サニタイズ不要
	let btn = document.querySelector(
		`#presets button[title="${title}"]` //サニタイズ不要
	);
	let tr = btn.closest("tr");
	tr.remove();

	document.getElementById("presetTitle").value = "";
} //f.delPreset

/* 不要
//◆サニタイズ
function escapeHTML(str){
	return str.replace(/[<>&"'`]/g, function(match){
		return {
			  '<': '&lt;'
			, '>': '&gt;'
			, '&': '&amp;'
			, '"': '&quot;'
			, "'": '&#x27;'
			, '`': '&#x60;'
		}[match];
	});//replace
}//f.escapeHTML
function unescapeHTML(str) {
	return str
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#x60;/g, '`')
	;
}//f.unescapeHTML
*/

//◆ストアデータの読込(グローバル変数の再構築)
/* globals retry_readStore:true*/
retry_readStore = 1;
function readStore() {
	chrome.storage.local.get(null, function (allitems) {
		let keys = Object.keys(allitems);
		if (keys.length === 0) {
			chrome.runtime.sendMessage("Store data is nothing.");
			initialize(InitialData);
			if(0<=retry_readStore){
				retry_readStore--;
				readStore(); //再帰実行
			} else{
				chrome.runtime.sendMessage("So I gave up.");
			}
			return;
		}
		for (let i = 0; i < keys.length; i++) {
			let title;
			if (keys[i].startsWith("ps_")) {
				title = keys[i].substr(3);
				presets2[title] = allitems["ps_" + title];
				//^※グローバル変数(ps_を除去)
			}
		} //for
		PSOrder = allitems.PSOrder; //※グローバル変数

		// bgcolor and fontsize スタイルの変更を実行
		if(allitems.backgroundColor){
			let key="backgroundColor:";
			let val=allitems.backgroundColor;
			setBgColor(key+val);
		}
		if(allitems.fontSize){
			let key="fontSize:";
			let val=allitems.fontSize;
			setFontSize(key+val);
		}

		//ログ
		//bg.log("presets2",presets2);
		//bg.log("PSOrder",PSOrder);

		//プリセットデータをドキュメントに挿入
		insertPresets();
	}); //storage..get
} //f.readStore

//◆メイン
document.addEventListener("DOMContentLoaded", function (ev) {
	//ロケールデータのセット
	setLocales();

	//ストレージから全データの読込
	readStore();

	//イベントリスナー
	let btnInfo = document.getElementById("btnInfo");
	btnInfo.addEventListener("click", putInfo);
	let btnThis = document.getElementById("btnThis");
	btnThis.addEventListener("click", applyThisWindow);
	let btnNew = document.getElementById("btnNew");
	btnNew.addEventListener("click", applyNewWindow);
	let btnClear = document.getElementById("btnClear");
	btnClear.addEventListener("click", clearTA);
	let btnAdd = document.getElementById("btnAdd");
	btnAdd.addEventListener("click", addPreset);
	let btnDel = document.getElementById("btnDel");
	btnDel.addEventListener("click", delPreset);

	//削除モード
	const keyAlt = 18; //macでは使えない
	const keyCommand = 15;//mac用
	document.addEventListener("keydown", function (ev) {
		let kc=ev.keyCode;
		if (kc!==keyCommand && kc!==keyAlt) return;
		btnAdd.classList.add("hide");
		btnDel.classList.add("show");
	}); //EventListener
	document.addEventListener("keyup", function (ev) {
		let kc=ev.keyCode;
		if (kc!==keyCommand && kc!==keyAlt) return;
		btnAdd.classList.remove("hide");
		btnDel.classList.remove("show");
	}); //EventListener
}); //.addEventListener "DOMContentLoaded"
