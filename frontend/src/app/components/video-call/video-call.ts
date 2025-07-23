import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SignalrService } from '../../services/signalr';

@Component({
  selector: 'app-video-call',
  standalone: false,
  templateUrl: './video-call.html',
  styleUrls: ['./video-call.css']
})
export class VideoCallComponent implements OnInit,OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;

  onlineUsers: string[] = [];

  private peer?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream: MediaStream = new MediaStream();
  private remoteUserId!: string;

  constructor(private signalr: SignalrService) {}
  ngOnDestroy(): void {
    this.signalr.stopConnection();
  }

  async ngOnInit() {
    this.signalr.startConnection();
    this.signalr.listenForUserList(); // start listening to server events

    // Subscribe to user list updates
    this.signalr.onUserListUpdate((users: string[]) => {
      this.onlineUsers = users;
    });
    /*await this.startMedia();

    this.signalr.onReceiveOffer(async (offer: string) => {
      const offerDesc = new RTCSessionDescription(JSON.parse(offer));
      await this.peer?.setRemoteDescription(offerDesc);
      const answer = await this.peer?.createAnswer();
      await this.peer?.setLocalDescription(answer);
      this.signalr.sendAnswer(this.remoteUserId, JSON.stringify(answer));
    });

    this.signalr.onReceiveAnswer(async (answer: string) => {
      const answerDesc = new RTCSessionDescription(JSON.parse(answer));
      await this.peer?.setRemoteDescription(answerDesc);
    });

    this.signalr.onReceiveIce(async (candidate: string) => {
      try {
        await this.peer?.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
      } catch (e) {
        console.error('ICE error:', e);
      }
    });*/
  }

  async startMedia() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalr.sendIceCandidate(this.remoteUserId, JSON.stringify(event.candidate));
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

  async initiateCall(remoteUserId: string) {
    this.remoteUserId = remoteUserId;

    const offer = await this.peer?.createOffer();
    await this.peer?.setLocalDescription(offer);
    this.signalr.sendOffer(remoteUserId, JSON.stringify(offer));
  }
}