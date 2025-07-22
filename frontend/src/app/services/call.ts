import { Injectable } from "@angular/core";
import { environment } from "../../environments/environments";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { AuthService } from "./auth";

@Injectable({ providedIn: 'root' })
export class CallService {
  private baseUrl = environment.apiUrl + '/calls';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.token}`
      })
    };
  }

  startCall(receiverId: number) {
    return this.http.post(`${this.baseUrl}/start?receiverId=${receiverId}`, {}, this.headers());
  }

  endCall(callId: number) {
    return this.http.post(`${this.baseUrl}/end/${callId}`, {}, this.headers());
  }

  getHistory() {
    return this.http.get(`${this.baseUrl}/history`, this.headers());
  }
}