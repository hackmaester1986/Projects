import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-call-request-modal',
  standalone: false,
  templateUrl: './request-modal.html',
  styleUrls: ['./request-modal.css']
})
export class RequestModalComponent {
  @Input() show: boolean = false;
  @Input() username: string = '';
  @Output() accept = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  close() {
    this.show = false;
    this.reject.emit(this.username);
  }

  acceptCall(){
    this.show = false;
    this.accept.emit(this.username);
  }
}
