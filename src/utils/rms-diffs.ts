export default function rmsDiff(data1: Uint8Array,data2: Uint8Array){
    console.log(data1.length, data2.length);
    if (data1.length !== data2.length) {
        throw new Error("Data arrays must be of the same length");
    }

    var squares = 0;
    for(var i = 0; i<data1.length; i++){
        squares += (data1[i]-data2[i])*(data1[i]-data2[i]);
    }
    var rms = Math.sqrt(squares/data1.length);
    return rms;
}