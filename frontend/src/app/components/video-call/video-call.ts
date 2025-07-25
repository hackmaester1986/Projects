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
  callerUsername: string = '';
  currentUserName: string = '';
  alertMessage = '';
  remoteUserId = '';

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
      });

      this.signalr.onReceiveAnswer(async (answer: string) => {
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
        this.incomingCallModalVisible = true;
        this.callerUsername = fromUser.userName;
      });

      this.signalr.receiveDenyRequest(() => {
        this.showDenyModal = true;
      });

      this.signalr.receiveHangUp(() => {
        this.endCall();
      });
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
    console.log(this.remoteStream);
    this.remoteVideo.nativeElement.srcObject = this.remoteStream;

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

  endCall() {
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


/*import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('localVideo') localVideo!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;

  onlineUsers: userHubConnection[] = [];
  incomingCallModalVisible = false;
  showDenyModal = false;
  callerUsername: string = '';
  currentUserName: string = '';
  alertMessage = '';
  remoteUserId = '';

  public peer?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream: MediaStream = new MediaStream();
  private queuedCandidates: RTCIceCandidate[] = [];

  constructor(private signalr: SignalrService) {}

  ngOnDestroy(): void {
    this.cleanup();
    this.signalr.stopConnection();
  }

  async ngOnInit() {
    this.userService.getCurrentUserName().subscribe(username => {
      this.currentUserName = username;
      this.signalr.startConnection();
      this.signalr.listenForUserList();

      this.signalr.onUserListUpdate((users: userHubConnection[]) => {
        this.onlineUsers = users;
      });

      this.signalr.onReceiveOffer(async (fromUser: userHubConnection, offer: string) => {
        await this.setupConnection(fromUser.userId.toString());
        await this.peer?.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

        const answer = await this.peer?.createAnswer();
        await this.peer?.setLocalDescription(answer);
        this.signalr.sendAnswer(fromUser.userId.toString(), JSON.stringify(answer));

        this.queuedCandidates.forEach(async candidate => {
          await this.peer?.addIceCandidate(candidate);
        });
        this.queuedCandidates = [];
        this.remoteUserId = fromUser.userId.toString();
      });

      this.signalr.onReceiveAnswer(async (answer: string) => {
        await this.peer?.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
      });

      this.signalr.onReceiveIce(async (candidate: string) => {
        const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
        if (this.peer?.remoteDescription && this.peer.remoteDescription.type) {
          await this.peer.addIceCandidate(iceCandidate);
        } else {
          this.queuedCandidates.push(iceCandidate);
        }
      });

      this.signalr.receiveRequest((fromUser: userHubConnection) => {
        this.incomingCallModalVisible = true;
        this.callerUsername = fromUser.userName;
      });

      this.signalr.receiveDenyRequest(() => {
        this.showDenyModal = true;
      });

      this.signalr.receiveHangUp(() => {
        this.endCall();
      });
    });
  }

  private async setupConnection(remoteId: string) {
    this.cleanup();

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
      event.streams[0].getTracks().forEach(track => this.remoteStream.addTrack(track));
      this.remoteVideo.nativeElement.srcObject = this.remoteStream;
    };

    this.localStream.getTracks().forEach(track => {
      this.peer?.addTrack(track, this.localStream!);
    });
  }

  async initiateCall(remoteUser: userHubConnection) {
    await this.setupConnection(remoteUser.userId.toString());
    const offer = await this.peer?.createOffer();
    await this.peer?.setLocalDescription(offer);

    const caller = this.onlineUsers.find(u => u.userName === this.currentUserName);
    if (caller) {
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

  private cleanup() {
    this.endCall();
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }


  endCall() {

    if (this.remoteUserId) {
      this.signalr.sendHangUp(this.remoteUserId);
    }
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localVideo.nativeElement.srcObject = null;
    }

    // Stop remote media tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteVideo.nativeElement.srcObject = null;
    }

    // Close the peer connection
    if (this.peer) {
      this.peer.close();
      this.peer = undefined;
    }

    // Reset state
    this.remoteStream = new MediaStream();
    this.queuedCandidates = [];
  }
}*/