var ngapp = angular.module('checklist', []);

ngapp.controller('ChecklistConfirm', 
	["config", "checklist", "voice", "log", "$scope", function(config, checklist, tts, log, $scope)
	{
		ctrl = this;
		
		ctrl.data = checklist;
		ctrl.editMode = false;
		
		ctrl.nextSection = null;
		ctrl.currentItem = null;
		ctrl.currentItemsList = [];
		ctrl.currentSection = null;
		ctrl.currentChecklist = null;
		
		ctrl.AvaliableChecklistNames = [];
		
		
		ctrl.itemTimeout = null;
		
		
		ctrl.isBusy = false;
		ctrl.displayMode = 'select'; // 'none'/'select'/'checklist';
		

		ctrl.SelectChecklists = function() {
			ctrl.ReloadChecklists();
			ctrl.displayMode='selectChecklist';
		
		}

		ctrl.ModeSelect = function(){
			ctrl.ReloadChecklists();
			ctrl.displayMode='select';
		}
		
		ctrl.GetNextSection = function (){
			var curSectionIndx = ctrl.data.sections.indexOf(ctrl.currentSection);
			var nextSection = ctrl.data.sections[curSectionIndx+1];
			return nextSection;
		}

		
		ctrl.SelectChecklist = function(chklstName){
			ctrl.aChecklistName = chklstName;
			ctrl.data.LoadLocalStorage(chklstName);
			ctrl.displayMode='select';
		}
		
		ctrl.AddChecklist = function(newChecklistName) {
			
			ctrl.data.NewData();
			ctrl.data.name = newChecklistName;
			ctrl.AvaliableChecklistNames.push(newChecklistName);
			ctrl.displayMode ='select';
		}
		
		ctrl.DeleteChecklist = function(chklstName){
			ctrl.data.DeleteLocalStorage(chklstName);
			ctrl.ReloadChecklists();
		}
		
		
		ctrl.LoadData = function() {
			ctrl.data.LoadLocalStorage(ctrl.data.name);
			ctrl.displayMode ='select';
		}
		
		ctrl.SaveData = function() {
			ctrl.data.SaveLocalStorage(ctrl.data.name);
			ctrl.ReloadChecklists();
		}
		
		ctrl.LoadTestData = function(){
			ctrl.data.loadTest();
			ctrl.displayMode ='select';
		}
		
		ctrl.SectionStart = function(vSection){
			if (vSection){
				ctrl.currentSection = vSection;
			} else {
				ctrl.currentSection = ctrl.data.sections[0];
			}

			ctrl.currentItemsList = Object.assign([], ctrl.currentSection.items);
			ctrl.displayMode = "checklist";
			tts.say("Секция: " + ctrl.currentSection.name).then(function(){
				ctrl.NextItem();
				$scope.$apply();
			});
			
		}
		
		ctrl.SectionRestart = function(){
			tts.say("Перезапуск карты").then(function(){
				ctrl.SectionStart(ctrl.currentSection);
			});
		}

		ctrl.SectionCancel = function(){
			tts.say("отмена");
			ctrl.currentItem = null;
			ctrl.currentItemsList = [];
			ctrl.currentSection = null;
			ctrl.displayMode='select';
		}
		
		ctrl.init = function(){
			ctrl.ReloadChecklists();
		}
		
		ctrl.EditSection = function (vSection){
			var secIndx = ctrl.data.sections.indexOf(vSection);
			
			ctrl.currentSection = vSection;
			ctrl.displayMode = 'editSection';
		}

		ctrl.DeleteSection = function (vSection){
			var secIndx = ctrl.data.sections.indexOf(vSection);
			ctrl.data.sections.splice(secIndx, 1);
		}
		
		ctrl.AddSection = function (sectionName){
			var newSection = { name: sectionName};
			ctrl.data.sections.push(newSection);		
		}

		ctrl.ReloadChecklists = function(){
			ctrl.AvaliableChecklistNames = ctrl.data.EnumChecklits();
		}
		
		
		ctrl.DeleteItem = function(item) {
			var itemIndx = ctrl.currentSection.items.indexOf(vSection);
			ctrl.currentSection.items.splice(secIndx, 1);
		}
		
		ctrl.AddItem = function() {
			var newItem = { "name": "new" };
			if (!ctrl.currentSection.items){
				ctrl.currentSection.items = [];
			}
			ctrl.currentSection.items.push(newItem);
		}
		
		ctrl.EndEditSection = function(){
			ctrl.displayMode = 'select';
			ctrl.data.SaveLocalStorage();
		}
		
		
		ctrl.NextItem = function (){
			ctrl.currentItem = ctrl.currentItemsList.splice(0,1)[0];
			if (ctrl.currentItem){
				tts.say(ctrl.currentItem.name);
				ctrl.isBusy = false;
				ctrl.SetTimeout();
			} else {
				ctrl.SectionEnd();
			}
		}
		
		
		ctrl.SayItem = function(){
			var msg = "Секция " + ctrl.currentSection.name + ". " + ctrl.currentItem.name;
			tts.say(msg);
		}
		
		ctrl.SetTimeout = function(){
			ctrl.ClearTimeout();
			ctrl.itemTimeout = setInterval(ctrl.SayItem, config.repeateTimeout);
		}
		
		ctrl.ClearTimeout = function(){
			if (ctrl.itemTimeout) {
				clearInterval(ctrl.itemTimeout);
				ctrl.itemTimeout = null;
			}
		}
		
		
		ctrl.SectionEnd = function (){
			ctrl.ClearTimeout();
			tts.say("Карта выполнена");
			ctrl.isBusy = false;			
			ctrl.displayMode = 'done';
			ctrl.nextSection = ctrl.GetNextSection();
		}
		
		ctrl.check = function(){
			ctrl.ClearTimeout();
			log.debug("check button");
			ctrl.isBusy = true;
			tts.say("check").then(function(){
				ctrl.NextItem();
				$scope.$apply()
			});
		}
		
		ctrl.skip = function(){
			ctrl.ClearTimeout();
			log.debug("skip button");
			ctrl.isBusy = true;
			tts.say("skip").then(function(){
				ctrl.NextItem();
				$scope.$apply()
			});
		}
		
		ctrl.init();
	}
]);


ngapp.factory('config', function(){
	var config = {}
	config.rate = 2;
	config.voice = 0;
	config.repeateTimeout = 20000;
	
	config.load = function(){
		config.rate = window.localStorage.getItem("cfgRate") ?? 2;
		config.voice = window.localStorage.getItem("cfgVoice") ?? 0;
		config.repeateTimeout = window.localStorage.getItem("cfgRepeateTimeout") ?? 20000;
	}

	config.save = function(){
		window.localStorage.setItem("cfgRate", config.rate);
		window.localStorage.setItem("cfgVoice", config.voice);
		window.localStorage.setItem("cfgRepeateTimeout", config.repeateTimeout);
	}
	config.load();
	
	return config;
});


ngapp.factory('checklist', function(){
	var svcChecklist = {};
	svcChecklist.name = "";
	svcChecklist.sections = [];
	svcChecklist.prefix = 'ck-';
	
	svcChecklist.EnumChecklits = function() {
		var listsList = [];
		for(var item in window.localStorage){
			if (item.substr(0,svcChecklist.prefix.length) == svcChecklist.prefix ){
				var chklName = item.substr(svcChecklist.prefix.length);
				listsList.push(chklName);
			}
		}
		return listsList;
	}

	svcChecklist.NewData = function(chkLstName){
		svcChecklist.name = chkLstName;
		var lsName = svcChecklist.prefix + svcChecklist.name;
		var lsData = {}
		svcChecklist.sections = {};
	}
	
	svcChecklist.LoadLocalStorage = function(chkLstName){
		svcChecklist.name = chkLstName;
		var lsName = svcChecklist.prefix + svcChecklist.name;
		var lsData = window.localStorage.getItem(lsName);
		svcChecklist.sections = JSON.parse(lsData);
	}
	
	svcChecklist.SaveLocalStorage = function(chkLstName){
		if (chkLstName) {
			svcChecklist.name = chkLstName;
		}
		var lsName = svcChecklist.prefix + svcChecklist.name;
		
		var lsData = JSON.stringify(svcChecklist.sections);
		window.localStorage.setItem(lsName, lsData);
	}
	
	svcChecklist.DeleteLocalStorage  = function(chkLstName){
		var lsName = svcChecklist.prefix + chkLstName;
		window.localStorage.removeItem(lsName);
	}
	
	svcChecklist.loadTest = function(msg){
		svcChecklist.sections = [
		{ "name": "перед запуском",
			"items": [
				{"name": "фары выключены"},
				{"name": "напряжение сети больше 12 вольт"},
				{"name": "вентиляция выключена"},
				{"name": "ручной тормоз затянут"}
			]
		},
		{ "name": "после запуска",
			"items": [
				{"name": "посторонних шумов нет"},
				{"name": "красные лампы не горят"},
				{"name": "вентиляция, режим 3"},
				{"name": "бензин 3 деления"}
			]
		},
		{ "name": "парковка",
			"items": [
				{"name": "стёкла подняты"},
				{"name": "фары выключены"},
				{"name": "стеклоочиститель выключен"},
				{"name": "передача нейтральная"},
				{"name": "ручной тормоз"}
			]
		}
		]
	}
	return svcChecklist;
});



ngapp.factory('voice', ["log", "config", function(log, config){
	var voiceService = {};
	voiceService.currentMsg = null
	
	voiceService.say = function(msg){
		if (voiceService.currentMsg){
			window.speechSynthesis.cancel();
		}
		
		log.debug("voice : " + msg);
		voiceService.currentMsg = new SpeechSynthesisUtterance(msg);
		
		var voicesList = window.speechSynthesis.getVoices();
		voiceService.currentMsg.voice = voicesList[config.voice];
		voiceService.currentMsg.rate=config.rate;
		
		var promise = new Promise(function(resolve) {
			voiceService.currentMsg.onend = resolve;
			window.speechSynthesis.speak(voiceService.currentMsg);
		});
		
		promise = promise.then(function(){
			voiceService.currentMsg = null;
			return;
		});
		return promise;
	}
	return voiceService;
}]);



ngapp.factory('log', function(){
	var logService = {};
	logService.debug = function(msg){
		console.log("log: " + msg);
	}
	return logService;
});