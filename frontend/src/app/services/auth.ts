import { Injectable } from "@angular/core";
import { environment } from "../../environments/environments";
import { BehaviorSubject, tap } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = environment.apiUrl + '/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  register(data: any) {
    return this.http.post(this.baseUrl + '/register', data);
  }

  login(data: any) {
    return this.http.post(this.baseUrl + '/login', data).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.token);
        this.currentUserSubject.next(res.token);
      })
    );
  }

  get token() {
    return localStorage.getItem('token');
  }
}
