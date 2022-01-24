import {FS} from "./hdf5_hl.js";

export const UPLOADED_FILES = [];

export function uploader() {
    let file = this.files[0] as File; // only one file allowed
    let datafilename = file.name;
    let reader = new FileReader();
    reader.onloadend = function (evt) {
        let data = evt.target.result as ArrayBuffer;
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
    a.style.display = "none";
    a.id = "savedata";
    return function (data, fileName) {
        var blob = (data instanceof Blob) ? data : new Blob([data], { type: 'application/x-hdf5' });
        // IE 10 / 11
        const nav = (window.navigator as any);
        if (nav.msSaveOrOpenBlob) {
            nav.msSaveOrOpenBlob(blob, fileName);
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

export function to_blob(hdf5_file) {
    hdf5_file.flush();
    return new Blob([FS.readFile(hdf5_file.filename)], {type: 'application/x-hdf5'});
}

export function download(hdf5_file) {
    let b = to_blob(hdf5_file);
    downloader(b, hdf5_file.filename);
}