import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SpeedDatingService, UserHubConnection } from '../../services/speed-dating-service';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';
import { userHubConnection } from '../../Models/userHubConnection';
import { UserHubConnectionPair } from '../../Models/UserHubConnectionPair';

@Component({
  selector: 'app-speed-dating',
  standalone:false,
  templateUrl: './speed-dating.html',
  styleUrls:['./speed-dating.css']
})
export class SpeedDatingComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  countdown: number = 10;
  sessionCountdown: number = 0;
  @Input() userId: string = '';
  @Output() endDatingEvent = new EventEmitter<void>(); 
  @Input() speedDatingGroup: UserHubConnection[] = [];
  @Input() userPairings: UserHubConnectionPair[] = [];
  filteredPairings: UserHubConnectionPair[] = [];
  myUserName = '';
  theirUserName = '';

  currentPairIndex: number = 0;

  localStream!: MediaStream;
  remoteStream!: MediaStream;
  showThankYouModal = false;

  countdownInterval: any;
  sessionInterval: any;

  constructor(private speedDatingService: SpeedDatingService) {}

  ngOnInit(): void {
    this.filteredPairings = this.userPairings.filter(pair =>{
      return pair.first.userId.toString() == this.userId || pair.second.userId.toString() == this.userId
    })
    this.speedDatingService.onRemoteStreamReceived(stream => {
      this.remoteStream = stream;
      this.remoteVideo.nativeElement.srcObject = stream;
    });
    this.initLocalVideo();
  }

  initLocalVideo() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      this.localStream = stream;
      this.localVideo.nativeElement.srcObject = stream;
      this.startIntroCountdown();
    });
  }

  startIntroCountdown() {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown === 0) {
        clearInterval(this.countdownInterval);
        this.startNextDate();
      }
    }, 1000);
  }

  startNextDate() {
    if (this.currentPairIndex >= this.filteredPairings.length) {
      this.endSpeedDating();
      return;
    }

    const pair = this.filteredPairings[this.currentPairIndex];

    if(pair.first.userId.toString() != this.userId){
      this.myUserName = pair.second.userName;
      this.theirUserName = pair.first.userName;
      this.speedDatingService.connectToDate(pair.first.userId.toString(),pair.second, this.localStream);
    }
    else{
      this.theirUserName = pair.second.userName;
      this.myUserName = pair.first.userName;
      this.speedDatingService.connectToDate(pair.second.userId.toString(),pair.first, this.localStream);
    }
    this.startSessionTimer();
  }

  startSessionTimer() {
    this.sessionCountdown = 60;
    this.sessionInterval = setInterval(() => {
      this.sessionCountdown--;
      if (this.sessionCountdown === 0) {
        clearInterval(this.sessionInterval);
        this.speedDatingService.disconnectPeerConnection();
        this.currentPairIndex++;
        this.startNextDate();
      }
    }, 1000);
  }

  endSpeedDating() {
    this.showThankYouModal = true;
  }

  redirectToVideoCall() {
    this.speedDatingService.disconnectFromSpeedDatingHub();
    this.endDatingEvent.emit();
  }

  ngOnDestroy(): void {
    this.speedDatingService.disconnectFromSpeedDatingHub();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.sessionInterval) clearInterval(this.sessionInterval);
  }
}