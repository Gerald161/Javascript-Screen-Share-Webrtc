var socket = io.connect('http://localhost:4000');

var UserVideo = document.querySelector('#localVideo')

var partnerVideo = document.querySelector('#remoteVideo')

var textarea = document.querySelector("textarea")

var call_container = document.querySelector("#call_container")

var incoming_call = document.querySelector('#incoming_call')

var yourID;

var candidate_to_add;

var other_ice;

var pc = new RTCPeerConnection({
  configuration : {
    offerToReceiveAudio: false,
    offerToReceiveVideo: true
  },
  iceServers: [
    {
        urls: "stun:numb.viagenie.ca",
        username: "sultan1640@gmail.com",
        credential: "98376683"
    },
    {
        urls: "turn:numb.viagenie.ca",
        username: "sultan1640@gmail.com",
        credential: "98376683"
    }
]
})

pc.onicecandidate = (e) => {
  if(e.candidate){
    // will send ice candidates from this side
    if(other_ice == yourID){
      console.log("shouldn't send any here")
    }else{
      socket.emit("candidate", {candidate: JSON.stringify(e.candidate)})
    }
  }
}

pc.oniceconnectionstatechange = (e) => {
}

pc.ontrack = (e) => {
  partnerVideo.srcObject = e.streams[0] 
}
   
const success = (stream) => {
  UserVideo.srcObject = stream
  pc.addStream(stream)
}

var displayMediaOptions = {
  video: {
    cursor: "always"
  },
  audio: false
};

navigator.mediaDevices.getDisplayMedia(displayMediaOptions).then(success).catch(() => {
  console.log('errors with the media device')
})

function createOffer(person_to_call){
  pc.createOffer({
    mandatory: {
      offerToReceiveAudio: false,
      offerToReceiveVideo: true
    },
  })
  .then(sdp => {
    socket.emit("callUser", {sdp: JSON.stringify(sdp), userToCall: person_to_call, from: yourID})

    pc.setLocalDescription(sdp)
  }, e => {})
}

function setRemoteDescription(sdp){
  const desc = JSON.parse(sdp)

  pc.setRemoteDescription(new RTCSessionDescription(desc))
}

function createAnswer(guy_I_accepted_call_from){
  pc.createAnswer({
    mandatory: {
      offerToReceiveAudio: false,
      offerToReceiveVideo: true
    }
  })
  .then(sdp => {
    socket.emit("acceptedCall", {sdp: JSON.stringify(sdp), guy_I_accepted_call_from: guy_I_accepted_call_from})

    pc.setLocalDescription(sdp)
  }, e => {})
}

function call_user(person_to_call){
  createOffer(person_to_call);
}

socket.on("yourID", (id) => {
  yourID = id;
})

socket.on("allUsers", (users) => {
  call_container.innerHTML = ''

  var all_users = Object.keys(users)

  all_users.forEach(user_id => {
    call_container.innerHTML += `
    <button class="call_button" data-person_to_call=${user_id}>Call</button>
    `
  })

  var call_buttons = document.querySelectorAll(".call_button")

  call_buttons.forEach(call_button => {
    call_button.addEventListener('click', (e) => {
      call_user(call_button.dataset.person_to_call)
    })
  })
})

function acceptCall(sdp, guy_I_accepted_call_from){
  setRemoteDescription(sdp)

  createAnswer(guy_I_accepted_call_from)

  const candidate = JSON.parse(candidate_to_add)

  pc.addIceCandidate(new RTCIceCandidate(candidate))
}

socket.on("got_ice", (data) => {
  if(data.id == yourID){
    other_ice = data.id;
  }else{
    other_ice = data.id;
    candidate_to_add = data.candidate
  }
  
})

socket.on("hey", (data) => {
  incoming_call.innerHTML = `
    <h1>${data.from} is calling you</h1>
    <div>
      <button id="answer">Answer</button>
      <button id="decline">Decline</button>
    </div>
  `

  var answer = document.querySelector("#answer")

  var decline = document.querySelector("#decline")

  answer.addEventListener('click', (e) => {
    acceptCall(data.sdp, data.from)
  })

  decline.addEventListener('click', (e) => {
    console.log("Declined call")
  })
})

socket.on("callAccepted", (data) => {
  pc.setRemoteDescription(JSON.parse(data.sdp))
})

function addCandidate(){
  const candidate = JSON.parse(candidate_to_add)

  pc.addIceCandidate(new RTCIceCandidate(candidate))
}