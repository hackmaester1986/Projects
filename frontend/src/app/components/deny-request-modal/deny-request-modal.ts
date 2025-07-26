import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-deny-request-modal',
  standalone:false,
  templateUrl: './deny-request-modal.html',
  styleUrl: './deny-request-modal.css'
})
export class DenyRequestModal {
  @Input() show: boolean = false;
  @Output() ok = new EventEmitter<void>();
  @Input() message: string = '';

  close() {
    this.show = false;
    this.ok.emit();
  }
}
