import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { App } from './app';
import { AppRoutingModule } from './app-routing.module';

// Import components
import { LoginComponent } from './components/login/login';
import { VideoCallComponent } from './components/video-call/video-call';
import { NavbarComponent } from './components/nav-bar/nav-bar';
import { HomepageComponent } from './components/homepage/homepage';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { RegisterComponent } from './components/register/register';
import { RequestModalComponent } from './components/request-modal/request-modal';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    App,
    LoginComponent,
    VideoCallComponent,
    NavbarComponent,
    HomepageComponent,
    RegisterComponent,
    RequestModalComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule,
    AppRoutingModule,
    NgbAlertModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [App]
})
export class AppModule {}