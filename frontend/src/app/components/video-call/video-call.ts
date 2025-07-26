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
export class VideoCallComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  onlineUsers: userHubConnection[] = [];
  incomingCallModalVisible = false;
  showDenyModal = false;
  showBusyModal = false;
  callerUsername: string = '';
  currentUserName: string = '';
  alertMessage = '';
  remoteUserId = '';
  inACall = false;

  public peer?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private queuedCandidates: RTCIceCandidate[] = [];

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.userService.getCurrentUserName().subscribe(async username => {
      this.currentUserName = username;
      this.signalr.startConnection();
      this.signalr.listenForUserList();

      this.signalr.onUserListUpdate((users: userHubConnection[]) => {
        this.onlineUsers = users;
      });

      this.signalr.onReceiveOffer(async (fromUser: userHubConnection, offer: string) => {
        if(!this.inACall){
          this.inACall = true;
          await this.setupConnection(fromUser.userId.toString());
          await this.peer?.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

          const answer = await this.peer?.createAnswer();
          await this.peer?.setLocalDescription(answer);
          this.signalr.sendAnswer(fromUser.userId.toString(), JSON.stringify(answer));

          for (const candidate of this.queuedCandidates) {
            await this.peer?.addIceCandidate(candidate);
          }
          this.queuedCandidates = [];
          this.remoteUserId = fromUser.userId.toString();
        }
        else{
          this.signalr.sendBusy(fromUser.userId.toString());
        }
      });

      this.signalr.onReceiveAnswer(async (answer: string) => {
        this.inACall = true;
        await this.peer?.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
      });

      this.signalr.onReceiveIce(async (candidate: string) => {
        const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
        if (this.peer?.remoteDescription?.type) {
          await this.peer.addIceCandidate(iceCandidate);
        } else {
          this.queuedCandidates.push(iceCandidate);
        }
      });

      this.signalr.receiveRequest((fromUser: userHubConnection) => {
        if(!this.inACall){
          this.incomingCallModalVisible = true;
          this.callerUsername = fromUser.userName;
        }
        else{
          this.signalr.sendBusy(fromUser.userId.toString());
        }
      });

      this.signalr.receiveDenyRequest(() => {
        this.showDenyModal = true;
      });

      this.signalr.receiveHangUp(() => {
        this.endCall();
      });

      this.signalr.receiveBusy(() => {
        this.showBusyModal = true;
      })
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.signalr.stopConnection();
  }

  private async setupConnection(remoteId: string) {
    this.cleanup();

    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.remoteStream = new MediaStream();
    setTimeout(() => {
        console.log('remoteStream');
        this.remoteVideo.nativeElement.srcObject = this.remoteStream!;
    }, 10000);

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalr.sendIceCandidate(remoteId, JSON.stringify(event.candidate));
      }
    };

    this.peer.ontrack = (event) => {
      for (const track of event.streams[0].getTracks()) {
        this.remoteStream?.addTrack(track);
      }
    };

    for (const track of this.localStream.getTracks()) {
      this.peer?.addTrack(track, this.localStream);
    }
  }

  async initiateCall(remoteUser: userHubConnection) {
    await this.setupConnection(remoteUser.userId.toString());
    const offer = await this.peer?.createOffer();
    await this.peer?.setLocalDescription(offer);

    const caller = this.onlineUsers.find(u => u.userName === this.currentUserName);
    if (caller && offer) {
      this.remoteUserId = remoteUser.userId.toString();
      this.signalr.sendOffer(remoteUser, caller, JSON.stringify(offer));
    }
  }

  sendCallRequest(remoteUser: userHubConnection) {
    const caller = this.onlineUsers.find(u => u.userName === this.currentUserName);
    if (caller) {
      this.signalr.sendCallRequest(remoteUser, caller);
    }
  }

  handleCallAccept(username: string) {
    const user = this.onlineUsers.find(u => u.userName === username);
    if (user) {
      this.incomingCallModalVisible = false;
      this.initiateCall(user);
    }
  }

  handleCallReject(username: string) {
    this.incomingCallModalVisible = false;
    const user = this.onlineUsers.find(u => u.userName === username);
    if (user) {
      this.signalr.sendCallRequestDeny(user);
    }
  }

  handleCallDeny() {
    this.showDenyModal = false;
  }

  handleBusy() {
    this.showBusyModal = false;
  }

  endCall() {
    this.inACall = false;
    if (this.remoteUserId) {
      this.signalr.sendHangUp(this.remoteUserId);
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteVideo.nativeElement.srcObject = null;
    }
    if (this.peer) {
      this.peer.close();
      this.peer = undefined;
    }
    this.remoteStream = undefined;
    this.queuedCandidates = [];
  }
}


