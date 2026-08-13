import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { SnipApiService, SnipLink } from './snip-api.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly api = inject(SnipApiService);

  readonly links = signal<SnipLink[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly createdShortUrl = signal('');

  urlInput = '';

  constructor() {
    this.refreshLinks();
  }

  onSubmit(): void {
    const url = this.urlInput.trim();
    if (!this.isValidHttpUrl(url)) {
      this.error.set('Please enter a valid http:// or https:// URL.');
      this.createdShortUrl.set('');
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    this.api
      .createLink(url)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (created) => {
          this.createdShortUrl.set(created.shortUrl);
          this.urlInput = '';
          this.refreshLinks();
        },
        error: (err) => {
          const message = err?.error?.error || 'Request failed. Check backend availability.';
          this.error.set(message);
          this.createdShortUrl.set('');
        },
      });
  }

  refreshLinks(): void {
    this.loading.set(true);
    this.error.set('');

    this.api
      .getLinks()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (links) => {
          this.links.set(links);
        },
        error: (err) => {
          const message = err?.error?.error || 'Failed to load links. Is the backend running on :3000?';
          this.error.set(message);
          this.links.set([]);
        },
      });
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
