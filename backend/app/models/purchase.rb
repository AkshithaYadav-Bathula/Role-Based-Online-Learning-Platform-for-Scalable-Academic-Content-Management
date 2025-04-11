class Purchase < ApplicationRecord
  belongs_to :user
  belongs_to :course
  
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :status, presence: true, inclusion: { in: ['pending', 'completed', 'failed'] }
  validates :payment_intent_id, presence: true, if: -> { status == "pending" && payment_intent_id.present? }
  enum status: {
    pending: 0,
    completed: 1,
    failed: 2
  }
end