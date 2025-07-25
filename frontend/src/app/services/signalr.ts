import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environments';
import { AuthService } from './auth';
import { Subject } from 'rxjs';
import { userHubConnection } from '../Models/userHubConnection';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection?: signalR.HubConnection;
  private userListSubject = new Subject<userHubConnection[]>();
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

    this.hubConnection.on('UserListUpdate', (users: userHubConnection[]) => {
      this.userListSubject.next(users);
    });
  }

  stopConnection(){
    this.hubConnection?.stop();
  }

  sendOffer(toUser: userHubConnection,fromUser: userHubConnection, offer: string) {
    this.hubConnection?.invoke('SendOffer', toUser,fromUser, offer);
  }

  onReceiveOffer(callback: (fromUser:userHubConnection,offer: string) => void) {
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

  receiveRequest(callback: (fromUser: userHubConnection) => void) {
    this.hubConnection?.on('ReceiveRequest', callback);
  }

  receiveDenyRequest(callback: () => void) {
    this.hubConnection?.on('ReceiveDenyRequest', callback);
  }

  onUserListUpdate(callback: (users: userHubConnection[]) => void) {
    this.userList$.subscribe(callback);
  }

  sendCallRequest(toUser: userHubConnection, fromUser: userHubConnection) {
    this.hubConnection?.invoke('SendRequest', toUser, fromUser);
  }

  sendCallRequestDeny(fromUser: userHubConnection) {
    this.hubConnection?.invoke('SendRequestDeny',fromUser);
  }

  listenForUserList() {
    this.hubConnection?.on('UserListUpdated', (users: userHubConnection[]) => {
      this.userListSubject.next(users);
    });
  } 
}