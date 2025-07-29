import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject,Subject } from 'rxjs';
import { environment } from '../../environments/environments';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth';
import { UserHubConnectionPair } from '../Models/UserHubConnectionPair';
export interface UserHubConnection {
  userId: number;
  userName: string;
  connectionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpeedDatingService {
  private auth = inject(AuthService);
  private hubConnection!: HubConnection;

  private groupMembersSubject = new BehaviorSubject<UserHubConnection[]>([]);
  groupMembers$ = this.groupMembersSubject.asObservable();

  private pairingsSubject = new BehaviorSubject<UserHubConnectionPair[]>([]);
  pairings$ = this.pairingsSubject.asObservable();

  private memberCountSubject = new Subject<number>();
  memberCount$ = this.memberCountSubject.asObservable();  

  public isConnected = false;

  private peerConnection!: RTCPeerConnection;
  private remoteStream = new MediaStream();
  private partnerId!: string;

  private rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };
  private remoteStreamReceivedCallback?: (stream: MediaStream) => void;

  onRemoteStreamReceived(callback: (stream: MediaStream) => void) {
    this.remoteStreamReceivedCallback = callback;
  }

  constructor() {}

  public startConnection(token: string): void {
    var count = 0;
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.dateUrl, {
        accessTokenFactory: () => this.auth.token!
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        this.isConnected = true;
        this.hubConnection?.on('SendMemberCount', (count: number)=>{
            this.memberCountSubject.next(count);
        });
        this.hubConnection?.on('StartSpeedDating', (groupMembers: UserHubConnection[], pairs: UserHubConnectionPair[])=>{
            this.pairingsSubject.next(pairs);
            this.groupMembersSubject.next(groupMembers);
        });
      })
      .catch(err => {});
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => {
        console.log('SpeedDatingHub disconnected');
        this.isConnected = false;
      });
    }
  }


    onGroupAssigned(callback: (group: string[], pairings: string[]) => void) {
        this.hubConnection.on('ReceiveSpeedDatingGroup', (group, pairings) => {
            callback(group, pairings);
        });
    }

    connectToDate(partner: string,currentUser: UserHubConnection, stream: MediaStream) {
        this.partnerId = partner;
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        // Send ICE candidates to the partner
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              console.log('ice ' + this.partnerId);
              console.log(event.candidate);
            this.hubConnection.invoke("SendIceCandidate", this.partnerId, event.candidate);
            }
        };

        // Set up remote stream listener
        this.peerConnection.ontrack = (event) => {
            this.remoteStream.addTrack(event.track);
            this.remoteStreamReceivedCallback?.(this.remoteStream);
        };

        // Add local tracks
        stream.getTracks().forEach((track) => {
            this.peerConnection.addTrack(track, stream);
        });

        // Create and send offer
        this.peerConnection.createOffer().then((offer) => {
            return this.peerConnection.setLocalDescription(offer);
        }).then(() => {
            console.log('offer ' + this.partnerId);
            console.log(currentUser);
            console.log(this.peerConnection.localDescription);
            this.hubConnection.invoke("SendOffer", this.partnerId,currentUser, this.peerConnection.localDescription);
        });
    }

    disconnectPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.getSenders().forEach(sender => sender.track?.stop());
            this.peerConnection.close();
        }
        this.remoteStream = new MediaStream();
    }

    disconnectFromSpeedDatingHub() {
        this.hubConnection?.stop();
    }

    setupSignalingHandlers() {
        this.hubConnection.on("ReceiveOffer", async (fromId: string, offer: RTCSessionDescriptionInit) => {
            this.partnerId = fromId;
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);

            this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.hubConnection.invoke("SendIceCandidate", this.partnerId, event.candidate);
            }
            };

            this.peerConnection.ontrack = (event) => {
            this.remoteStream.addTrack(event.track);
            this.remoteStreamReceivedCallback?.(this.remoteStream);
            };

            const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.getTracks().forEach((track) => {
            this.peerConnection.addTrack(track, localStream);
            });

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.hubConnection.invoke("SendAnswer", fromId, answer);
        });

        this.hubConnection.on("ReceiveAnswer", async (fromId: string, answer: RTCSessionDescriptionInit) => {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        });

        this.hubConnection.on("ReceiveIceCandidate", async (fromId: string, candidate: RTCIceCandidateInit) => {
            try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
            console.error("Error adding ICE candidate", err);
            }
        });
    }

    /*onReceiveGroupCount(callback: (count:number) => void) {
        this.hubConnection?.on('SendMemberCount', callback);
    }*/
    /*connectToSpeedDatingHub(): Promise<void> {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(environment.hubUrl+'/speeddatinghub')
            .build();

        return this.hubConnection.start();
    }*/
}