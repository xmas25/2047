var print = console.log
var prerr = console.error

var gebcn = e=> cn=>e.getElementsByClassName(cn)
var gebtn = e=> n=>e.getElementsByTagName(n)
var geid = i=>document.getElementById(i)
var print = console.log
var foreach = a=> f=>{var r=[];for(var i=0;i<a.length;i++){r.push(f(a[i]))}return r}

function dce(t){return document.createElement(t)}

var cap = i=>Math.min(Math.max(i,0), 1)

// conversion between utf8 and arraybuffer

// https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330

// This is free and unencumbered software released into the public domain.

// Marshals a string to an Uint8Array.
function encodeUTF8(s) {
  var i = 0, bytes = new Uint8Array(s.length * 4);
  for (var ci = 0; ci != s.length; ci++) {
    var c = s.charCodeAt(ci);
    if (c < 128) {
      bytes[i++] = c;
      continue;
    }
    if (c < 2048) {
      bytes[i++] = c >> 6 | 192;
    } else {
      if (c > 0xd7ff && c < 0xdc00) {
        if (++ci >= s.length)
        throw new Error('UTF-8 encode: incomplete surrogate pair');
        var c2 = s.charCodeAt(ci);
        if (c2 < 0xdc00 || c2 > 0xdfff)
        throw new Error('UTF-8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range');
        c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
        bytes[i++] = c >> 18 | 240;
        bytes[i++] = c >> 12 & 63 | 128;
      } else bytes[i++] = c >> 12 | 224;
      bytes[i++] = c >> 6 & 63 | 128;
    }
    bytes[i++] = c & 63 | 128;
  }
  return bytes.subarray(0, i);
}

// Unmarshals a string from an Uint8Array.
function decodeUTF8(bytes) {
  var i = 0, s = '';
  while (i < bytes.length) {
    var c = bytes[i++];
    if (c > 127) {
      if (c > 191 && c < 224) {
        if (i >= bytes.length)
        throw new Error('UTF-8 decode: incomplete 2-byte sequence');
        c = (c & 31) << 6 | bytes[i++] & 63;
      } else if (c > 223 && c < 240) {
        if (i + 1 >= bytes.length)
        throw new Error('UTF-8 decode: incomplete 3-byte sequence');
        c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      } else if (c > 239 && c < 248) {
        if (i + 2 >= bytes.length)
        throw new Error('UTF-8 decode: incomplete 4-byte sequence');
        c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      } else throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
    }
    if (c <= 0xffff) s += String.fromCharCode(c);
    else if (c <= 0x10ffff) {
      c -= 0x10000;
      s += String.fromCharCode(c >> 10 | 0xd800)
      s += String.fromCharCode(c & 0x3FF | 0xdc00)
    } else throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');
  }
  return s;
}

function tryjson(s){
  try{
    j = JSON.parse(s)
    // print('parsed')
    return j
  }catch(e){
    // print('not parsed')
    return s
  }
}

// how to http
function xhr(method, dest, data){
  return new Promise((res,rej)=>{
    var r = new XMLHttpRequest();
    r.addEventListener('loadend', function(){
      if (this.status>=200 && this.status<300){
        res(tryjson(this.responseText))
      }else{
        resp = tryjson(this.responseText)
        if(resp.error){
          rej (this.status + ' '+this.statusText+ '\n' + resp.error)
        }else{
          if(this.status==0){
            this.statusText='Connection Failed'
          }
          rej(this.status +' '+ this.statusText + '\n' + this.responseText.slice(100))
        }
      }
      // print(this)
    })
    r.open(method, dest)
    r.timeout = 15000;
    if (data){
      r.setRequestHeader('Content-type','application/json')
      r.send(data)
    }else{
      r.send()
    }
  })
}

// access api
function api(j){
  return xhr('post', '/api', JSON.stringify(j))
}

//  generate timed pings
function timed(interval){
  setTimeout(function(){
    var itvl = interval
    xhr('get', '/api?action=ping').then(js=>{
      if(js.interval){
        itvl = js.interval
        // print(itvl)
      }
    }).catch(prerr).then(()=>{
      timed(itvl)
    })
  }, interval)
}
timed(5000)

// use client side hashing
// such that servers need not know the actual password.

// this will protect agianst common passwords across various sites
// after publishing the database.
// this will not protect against impersonation after user logged onto another copy of the site with the published database.

// public key crypto should be added in the future.
function hash_user_pass(username, password){
  var fin = md5(password+username)
  var pi = h=>parseInt(h,16)
  var h2a = h=>h.split('').map(pi)
  var sum = k=>k.reduce((a,b)=>a+b)
  var times = 8964 + sum(h2a(fin)) * 2047 % 8964
  print(times)

  for(var i=0; i<times; i++){
    switch (pi(fin[31]) % 3){
      case 0:
      fin = md5(password+fin+username);break
      case 1:
      fin = md5(username+fin+password);break
      case 2:
      fin = md5(fin+password+username);break
      default:
      return 'this is NOT cryptographically secure but enough of a headache'
    }
  }
  return fin
}

// user register
var regbtn = geid('register')

if (regbtn){
  geid('username').focus()

  regbtn.onclick = function(){

    var username = geid('username').value
    var password = geid('password').value
    var password2 = geid('password2').value
    var invcode = geid('invitation').value

    if (password!=password2){
      alert('两次密码不一致')
      return false
    }

    regbtn.disabled=true

    api({
      action:'register',
      username:username,
      password_hash:hash_user_pass(username, password),
      invitation_code:invcode,
    })
    .then(res=>{
      print(JSON.stringify(res))
      alert('注册成功，请登录')

      window.location.href = '/login?username='+username
    })
    .catch(err=>{
      alert(err)
      regbtn.disabled=false
    })
  }
}

var loginbtn = geid('login')
if (loginbtn){
  geid('username').focus()
  if(geid('username').value.length>0){
    geid('password').focus()
  }

  loginbtn.onclick=function(){
    var username = geid('username').value
    var password = geid('password').value
    loginbtn.disabled=true
    api({
      action:'login',
      username:username,
      password_hash:hash_user_pass(username, password),
    })
    .then(res=>{
      if (document.referrer.match('/register')||document.referrer==""){
        window.location.href = '/'
      }else{
        window.history.back()
      }
    })
    .catch(err=>{
      alert(err)
      loginbtn.disabled=false
    })
  }
}

function logout(){
  api({
    action:'logout'
  })
  .then(res=>{
    window.location.reload()
  })
  .catch(alert)
}

var editor_target = geid('editor_target')

if (editor_target){
  var bpreview = geid('editor_btnpreview')
  var bsubmit = geid('editor_btnsubmit')
  var preview = geid('editor_preview')
  var editor_text = geid('editor_text')
  var editor_right = geid('editor_right')

  editor_right.style.display = 'none'

  bpreview.onclick = function(){
    bpreview.disabled = true

    api({
      action:'render',
      content:editor_text.value
    })
    .then(j=>{
      preview.innerHTML = j.html
      editor_right.style.display = 'initial'
    })
    .catch(alert)
    .then(()=>{
      bpreview.disabled = false
    })
  }

  bsubmit.onclick = function(){
    bsubmit.disabled = true
    bpreview.disabled = true

    _type = editor_target.getAttribute('_type')
    _id = editor_target.getAttribute('_id')

    api({
      action:'post',
      type:_type,
      id:_id,
      content:editor_text.value,
    })
    .then(j=>{
      // window.location.reload()
      print(j)
      // alert(j)
      editor_text.value = "" // firefox didn't clear the box
      window.location.reload()
    })
    .catch(alert)
    .then(()=>{
      bpreview.disabled = false
      bsubmit.disabled = false
    })
  }
}

function generate_invitation_code(){
  api({
    action:'generate_invitation_code',
  })
  .then(()=>{
    window.location.reload()
  })
  .catch(alert)
}
