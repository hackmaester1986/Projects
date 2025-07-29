import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-thank-you-modal',
  standalone:false,
  templateUrl: './thank-you-modal.html',
})
export class ThankYouModalComponent {
  @Output() close = new EventEmitter<void>();
}