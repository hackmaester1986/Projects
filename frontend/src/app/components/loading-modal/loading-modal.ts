import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-modal',
  standalone:false,
  templateUrl: './loading-modal.html',
  styleUrls: ['./loading-modal.css']
})
export class LoadingModalComponent {
  @Input() message: string = 'Loading...';
  @Input() show: boolean = false;
}