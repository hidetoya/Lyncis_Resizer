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
		PSOrder: ["640x480", "800x600", "1024x768"]
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

	//ログ
	bg.log("presets2",presets2);
	bg.log("PSOrder",PSOrder);
	//ストアデータ読込(テスト)
	chrome.storage.local.get(null,function(allitems){
		bg.log("allitems");
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
		return;
	}
	
	delete order.exec; //execプロパティがあれば削除
	chrome.windows.create(order);
} //f.applyNewWindow

//◆現在のウィンドウに適用
function applyThisWindow() {
	let myta = document.getElementById("myta");
	let order;

	//import
	if(myta.value.match(/\s*import\s*:/)){
		importPresets(myta);
		return;
	}
	
	//reset
	if(myta.value.match(/\s*reset\s*:/)){
		resetData();
		return;
	}
	
	//export
	if(myta.value.match(/\s*export\s*:/)){
		exportPresets(myta);
		return;
	}

	myta.classList.remove("error"); //clear
	try {
		order = JSON.parse(myta.value);
	} catch (e) {
		myta.classList.add("error");
		return;
	}
	delete order.exec; //execプロパティがあれば削除
	order.focused = true;
	chrome.windows.getCurrent(null, function (w) {
		console.log("debug:",w.id);
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
	let obj = {
		"PSOrder": PSOrder
	};
	for(let key of PSOrder){
		obj["ps_"+key]=presets2[key];
	}
	let txt = JSON.stringify(obj);
	txt = txt
		.replace(/:"\{/g,":'{")
		.replace(/\}"/g,"}'")
		.replace(/\\"/g,'"')
	;
	myta.value = txt;
}//f.exportsPresets

//◆インポート
function importPresets(myta){
	let obj=parseImportData(myta.value);
	//^ InitialData形式またはエラー番号で戻す
	
	if(0<obj) {
		myta.classList.add("error");
		return;
	}
	initialize(obj); //データの初期化
	return;
}//f.importPresets

//◆インポートデータのパース
function parseImportData(itxt){
	//console.log(itxt);
/*
	//サンプル(1)
	let InitialData = {
			PSOrder: ["640x480", "800x600", "1024x768"]
		,	"ps_640x480": '{"left":10,"top":10,"width":640,"height":480}'
		,	"ps_800x600": '{"left":10,"top":10,"width":800,"height":600}'
		,	"ps_1024x768": '{"left":10,"top":10,"width":1024,"height":768}'
	}; //InitialData
	let itxt="import:"+JSON.stringify(InitialData);
	console.log(itxt);

	{"PSOrder":["640x480","800x600","1024x768"],"ps_640x480":"{\"left\":10,\"top\":10,\"width\":640,\"height\":480}","ps_800x600":"{\"left\":10,\"top\":10,\"width\":800,\"height\":600}","ps_1024x768":"{\"left\":10,\"top\":10,\"width\":1024,\"height\":768}"}
*/

/*
	//サンプル(2)
	let itxt=`
		import:{
			PSOrder: ["640x480", "800x600", "1024x768","メイン","サブ"]
		,	"ps_640x480": '{"left":10,"top":10,"width":640,"height":480}'
		,	"ps_800x600": '{"left":10,"top":10,"width":800,"height":600}'
		,	"ps_1024x768": '{"left":10,"top":10,"width":1024,"height":768}'
		,	"ps_メイン": '{"left":10,"top":10,"width":1024,"height":768}'
		,	"ps_サブ": '{"left":10,"top":10,"width":1024,"height":768}'
		}
	`;
*/

	//正規表現による定義
	//^ バックスラッシュのエスケープに注意。また読みやすくするため空白と「(#」には特別な意味があるので注意
	const baseD = ` import : \\{ body\\} `;
	const bodyD = `psorder , presets (?:, presets )*`;
	const psorderD = `(#:PSOrder|"PSOrder") : pso_arr`; //#:$1
	const pso_arrD = `\\[ (#:dquo (?:, dquo)*) \\]`; //#:$2
	const presetsD=`"(#:ps_[^"]+)" : (#:squo|dquo)`;
	//^ #:$3,#5,... #:$4,#6,...のように、マッチする部分が増えても参照番号は増えない。#5,#6には最後にマッチする部分が代入されるようだ
	const dquoD=`"(?:[^"]+)"`;
	//^ エスケープ「\"」は別途考慮している
	const squoD=`'(?:[^']+)'`;

	//正規表現の構築
	let re=baseD;//文字列形式の正規表現
	re=re.replace(/body/,bodyD)
		.replace(/psorder/,psorderD)
		.replace(/pso_arr/,pso_arrD)
		.replace(/presets/g,presetsD)
		.replace(/dquo/g,dquoD)
		.replace(/squo/g,squoD)
	;
	//フリーフォーマット化
	re=re.replace(/ /g,"\\s*");

	//参照マーク「(#:」の置換
	re=re.replace(/\(#:/g,"(");
	//^ 以上で基本構築終わり

	//debug
	let re_debug0=re;
	let re_debugN=re.replace(/\((?!\?)/g,"#").replace(/[^#]/g,".");
	console.log("//"+re_debug0+"\n//"+re_debugN);
	//\s*import\s*:\s*\{\s*(PSOrder|"PSOrder")\s*:\s*\[\s*("(?:\"|[^\"])+"\s*(?:,\s*"(?:\"|[^\"])+")*)\s*\]\s*,\s*"(ps_[^"]+)"\s*:\s*('(?:[^']+)'|"(?:\"|[^\"])+")\s*(?:,\s*"(ps_[^"]+)"\s*:\s*('(?:[^']+)'|"(?:\"|[^\"])+")\s*)*\}\s*
	//.....................#..............................#........................................................#.................#.......................................#.................#......................................

	//文字列全体のマッチング -- results
	let rgex=new RegExp("^"+re+"$");
	itxt=itxt.replace(/\\"/g,"\x1B"); //「\"」のエスケープ
	let results = itxt.match(rgex);
	//^ mオプションがないので 1行ごとではなく、文字列全体のマッチングとなる
	/* 結果の一例
	1: "PSOrder"
	2: `"640x480", "800x600", "1024x768"`
	3: "ps_640x480"
	4: `'{"left":10,"top":10,"width":640,"height":480}'`
	5: "ps_1024x768"
	6: `'{"left":10,"top":10,"width":1024,"height":768}'`
	*/
	if(!results) {
		console.error("Not match");
		return 1;
	}

	//可変長部分のマッチ -- つまり 各presetsのマッチ
	let retval = { PSOrder: [] }; //戻り値用
	let pso = results[2].split(/\s*,\s*/);
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
			console.error("Not match: in part_variable");
			return 2;
		}
		let title=part_variable[1];
		let pstxt=part_variable[2].substr(1,part_variable[2].length-2); //引用符の除去
		pstxt=pstxt.replace(/\x1B/g,'"'); //「\"」のアンエスケープ
		console.log(i+"\ntitle:<"+title+">\npstxt:<"+pstxt+">\n");
		retval[title]=pstxt; //保存
	}//for
	//console.log(retval);
	return retval;
}//f.parseImportData


//◆テキストエリアのクリア
function clearTA() {
	let myta = document.getElementById("myta");
	myta.classList.remove("error"); //clear
	myta.value = "";
} //f.clearTA

//◆プリセットの挿入・クリックイベント設定
function insertPresets() {
	//ログ
	bg.log("presets2 in insertPreset");
	bg.log(presets2);
	bg.log(PSOrder);

	let ip = document.querySelector('#presets table>tbody');
	let btnSet=chrome.i18n.getMessage("btnSet");
	for (let i = PSOrder.length - 1; 0 <= i; i--) {
		let title = PSOrder[i];
/*
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
			let title=this.title;
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
/*
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
	let btn = document.querySelector(
		`#presets button[title="${title}"]`
	);
	let tr = btn.closest("tr");
	tr.remove();

	document.getElementById("presetTitle").value = "";
} //f.delPreset

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

		//ログ
		bg.log("presets2",presets2);
		bg.log("PSOrder",PSOrder);

		//プリセットデータをドキュメントに挿入
		insertPresets();
	}); //.get
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

function escapeHTML (str) {
	return str.replace(/[&'`"<>]/g, function(match) {
		return {
				'<': '&lt;'
			,	'>': '&gt;'
			,	'&': '&amp;'
			,	'"': '&quot;'
			,	"'": '&#x27;'
			,	'`': '&#x60;'
		}[match];
	});//replace
}//f.escapeHTML

