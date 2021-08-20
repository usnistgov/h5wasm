import {FS} from "./hdf5_hl.js";

export const UPLOADED_FILES = [];

export function uploader() {
    let file = this.files[0]; // only one file allowed
    let datafilename = file.name;
    let reader = new FileReader();
    reader.onloadend = function (evt) {
        let data = evt.target.result;
        FS.writeFile(datafilename, new Uint8Array(data));
        if (!UPLOADED_FILES.includes(datafilename)) {
            UPLOADED_FILES.push(datafilename);
            console.log("file loaded:", datafilename);
        }
        else {
            console.log("file updated: ", datafilename)
        }
    }
    reader.readAsArrayBuffer(file);
    this.value = "";
}

function create_downloader() {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.id = "savedata";
    return function (data, fileName) {
        var blob = (data instanceof Blob) ? data : new Blob([data], { type: 'application/x-hdf5' });
        // IE 10 / 11 
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, fileName);
        } else {
            var url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.target = "_blank";
            //window.open(url, '_blank', fileName);
            a.click();
            setTimeout(function () { window.URL.revokeObjectURL(url) }, 1000);
        }
        // cleanup: this seems to break things!
        //document.body.removeChild(a);
    };
};

export const downloader = create_downloader();