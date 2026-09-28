const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('d2plusDesktop',Object.freeze({minimize:()=>ipcRenderer.invoke('d2plus-window','minimize'),maximize:()=>ipcRenderer.invoke('d2plus-window','maximize'),close:()=>ipcRenderer.invoke('d2plus-window','close')}));
