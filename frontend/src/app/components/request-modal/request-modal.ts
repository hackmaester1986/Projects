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
  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  close() {
    this.reject.emit();
  }
}
