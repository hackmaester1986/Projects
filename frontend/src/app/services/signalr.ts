import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environments';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection?: signalR.HubConnection;

  constructor(private auth: AuthService) {

  }

  startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        accessTokenFactory: () => this.auth.token!
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR connected'))
      .catch(err => console.error('SignalR error:', err));
  }

  sendOffer(toUserId: number, offer: string) {
    this.hubConnection?.invoke('SendOffer', toUserId.toString(), offer);
  }

  onReceiveOffer(callback: (offer: string) => void) {
    this.hubConnection?.on('ReceiveOffer', callback);
  }

  sendAnswer(toUserId: number, answer: string) {
    this.hubConnection?.invoke('SendAnswer', toUserId.toString(), answer);
  }

  onReceiveAnswer(callback: (answer: string) => void) {
    this.hubConnection?.on('ReceiveAnswer', callback);
  }

  sendIceCandidate(toUserId: number, candidate: string) {
    this.hubConnection?.invoke('SendIceCandidate', toUserId.toString(), candidate);
  }

  onReceiveIce(callback: (candidate: string) => void) {
    this.hubConnection?.on('ReceiveIceCandidate', callback);
  }
}