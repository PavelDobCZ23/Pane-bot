var a = 0;

function test () {
    let a = undefined;
    console.log(a);
}

console.log('hi');
test();//undefined
console.log(a);//0
