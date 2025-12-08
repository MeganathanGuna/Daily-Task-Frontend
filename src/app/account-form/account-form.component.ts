import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService, Account } from 'src/app/task.service';

@Component({
  selector: 'app-account-form',
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.css']
})
export class AccountFormComponent {
  @Output() formClosed = new EventEmitter<void>();
  accountForm: FormGroup;

  constructor(private fb: FormBuilder, private service: TaskService) {
    this.accountForm = this.fb.group({
      accountName: ['', Validators.required]
    });
  }

  submit() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const newAccount: Account = this.accountForm.value;
    this.service.createAccount(newAccount).subscribe(() => {
      alert('✅ Account created successfully');
      this.closeForm();
    });
  }

  closeForm() {
    this.formClosed.emit();
  }
}
