class Notification < ApplicationRecord
  belongs_to :user
  belongs_to :actor, class_name: 'User', foreign_key: 'actor_id', optional: true
  belongs_to :course, optional: true
  belongs_to :course_doubt, optional: true

  validates :kind, presence: true
  validates :title, presence: true
  validates :message, presence: true

  scope :unread, -> { where(read_at: nil) }
end
