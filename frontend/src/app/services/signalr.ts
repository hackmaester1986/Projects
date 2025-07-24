import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environments';
import { AuthService } from './auth';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection?: signalR.HubConnection;
  private userListSubject = new Subject<string[]>();
  userList$ = this.userListSubject.asObservable();

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

    this.hubConnection.on('UserListUpdate', (users: string[]) => {
      this.userListSubject.next(users);
    });
  }

  stopConnection(){
    this.hubConnection?.stop();
  }

  sendOffer(toUserId: string, offer: string) {
    this.hubConnection?.invoke('SendOffer', toUserId.toString(), offer);
  }

  onReceiveOffer(callback: (offer: string) => void) {
    this.hubConnection?.on('ReceiveOffer', callback);
  }

  sendAnswer(toUserId: string, answer: string) {
    this.hubConnection?.invoke('SendAnswer', toUserId.toString(), answer);
  }

  onReceiveAnswer(callback: (answer: string) => void) {
    this.hubConnection?.on('ReceiveAnswer', callback);
  }

  sendIceCandidate(toUserId: string, candidate: string) {
    this.hubConnection?.invoke('SendIceCandidate', toUserId.toString(), candidate);
  }

  onReceiveIce(callback: (candidate: string) => void) {
    this.hubConnection?.on('ReceiveIceCandidate', callback);
  }

  receiveRequest(callback: (fromUser: string) => void) {
    this.hubConnection?.on('ReceiveRequest', callback);
  }

  onUserListUpdate(callback: (users: string[]) => void) {
    this.userList$.subscribe(callback);
  }

  sendCallRequest(toUserName: string, fromUserName: string) {
    this.hubConnection?.invoke('SendRequest', toUserName.toString(), fromUserName);
  }

  listenForUserList() {
    this.hubConnection?.on('UserListUpdated', (users: string[]) => {
      this.userListSubject.next(users);
    });
  } 
}