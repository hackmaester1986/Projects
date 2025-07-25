import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SignalrService } from '../../services/signalr';
import { UserService } from '../../services/user-service';
import { userHubConnection } from '../../Models/userHubConnection';

@Component({
  selector: 'app-video-call',
  standalone: false,
  templateUrl: './video-call.html',
  styleUrls: ['./video-call.css']
})
export class VideoCallComponent implements OnInit,OnDestroy {
  private userService = inject(UserService);

  @ViewChild('localVideo') localVideo!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;

  onlineUsers: userHubConnection[] = [];
  incomingCallModalVisible = false;
  showDenyModal = false;
  callerUsername: string = '';
  currentUserName: string = '';
  alertMessage = '';
  private isRemoteDescriptionSet = false;
  private queuedCandidates: RTCIceCandidate[] = [];

  private peer?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream: MediaStream = new MediaStream();
  private remoteUserId!: string;

  constructor(private signalr: SignalrService) {}
  ngOnDestroy(): void {
    this.signalr.stopConnection();
  }

  async ngOnInit() {

    this.userService.getCurrentUserName().subscribe(username =>{
      this.currentUserName = username;
      this.signalr.startConnection();
      this.signalr.listenForUserList(); // start listening to server events

      // Subscribe to user list updates
      this.signalr.onUserListUpdate((users: userHubConnection[]) => {
        this.onlineUsers = users;
      });
      //await this.startMedia();

      /*this.signalr.onReceiveOffer(async (fromUser:userHubConnection,offer: string) => {
        await this.startMedia(fromUser.userId.toString());
        const offerDesc = new RTCSessionDescription(JSON.parse(offer));
        console.log('remote description ' + offerDesc);
        await this.peer?.setRemoteDescription(offerDesc);
        const answer = await this.peer?.createAnswer();
        await this.peer?.setLocalDescription(answer);
        this.signalr.sendAnswer(fromUser.userId.toString(), JSON.stringify(answer));
      });*/
      this.signalr.onReceiveOffer(async (fromUser:userHubConnection,offer: string) => {
        await this.startMedia(fromUser.userId.toString());
        const offerDesc = new RTCSessionDescription(JSON.parse(offer));
        console.log('remote description ' + offerDesc);
        await this.peer?.setRemoteDescription(offerDesc);
        this.isRemoteDescriptionSet = true;

        // Apply any ICE candidates received before remote description
        this.queuedCandidates.forEach(async candidate => {
          try {
            await this.peer?.addIceCandidate(candidate);
          } catch (err) {
            console.error('Error applying queued ICE candidate:', err);
          }
        });
        this.queuedCandidates = [];

        const answer = await this.peer?.createAnswer();
        await this.peer?.setLocalDescription(answer);
        this.signalr.sendAnswer(fromUser.userId.toString(), JSON.stringify(answer));
      });

      this.signalr.onReceiveAnswer(async (answer: string) => {
        console.log('Received answer:', answer);
        const answerDesc = new RTCSessionDescription(JSON.parse(answer));
        console.log('remote description');
        await this.peer?.setRemoteDescription(answerDesc);
      });

      /*this.signalr.onReceiveIce(async (candidate: string) => {
        try {
          console.log('add ice');
          await this.peer?.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
        } catch (e) {
          console.error('ICE error:', e);
        }
      });*/
      this.signalr.onReceiveIce(async (candidate: string) => {
        const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));

        if (this.isRemoteDescriptionSet) {
          console.log('Applying ICE candidate immediately');
          try {
            await this.peer?.addIceCandidate(iceCandidate);
          } catch (e) {
            console.error('ICE error:', e);
          }
        } else {
          console.log('Queueing ICE candidate');
          this.queuedCandidates.push(iceCandidate);
        }
      });

      this.signalr.receiveRequest(async (fromUser: userHubConnection) =>{
        this.incomingCallModalVisible = true;
        this.callerUsername = fromUser.userName;
      })

      this.signalr.receiveDenyRequest(async () => {
        this.showDenyModal = true;
      })
    },
    error => {
      console.log('err');
    })
  }

  async startMedia(remoteId:string) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalr.sendIceCandidate(remoteId, JSON.stringify(event.candidate));
      }
    };

    this.peer.ontrack = (event) => {
      console.log('track received ' + event);
      event.streams[0].getTracks().forEach(track => this.remoteStream.addTrack(track));
      this.remoteVideo.nativeElement.srcObject = this.remoteStream;
    };

    this.localStream.getTracks().forEach(track => {
      console.log('stream ' + this.localStream);
      this.peer?.addTrack(track, this.localStream!);
    });
  }

  async initiateCall(remoteUser: userHubConnection) {
    await this.startMedia(remoteUser.userId.toString());
    console.log('Local stream tracks before offer:', this.localStream?.getTracks());
    const offer = await this.peer?.createOffer();
    await this.peer?.setLocalDescription(offer);
    var user = this.onlineUsers.find(user => user.userName == this.currentUserName);
    if(user){

      this.signalr.sendOffer(remoteUser,user, JSON.stringify(offer));
    }
  }

  sendCallRequest(remoteUser: userHubConnection){
    var user = this.onlineUsers.find(user => user.userName == this.currentUserName);
    if(user && remoteUser){
      this.signalr.sendCallRequest(remoteUser,user);
    }
  }

  handleCallAccept(username: string){
    var user = this.onlineUsers.find(user => user.userName == username);
    if(user){
      this.initiateCall(user);
    }
  }

  handleCallReject(username:string){
    this.incomingCallModalVisible=false;
    var user = this.onlineUsers.find(user => user.userName == username);
    if(user){
      this.signalr.sendCallRequestDeny(user);
    }
    
  }

  handleCallDeny(){
    this.showDenyModal = false;
  }
}