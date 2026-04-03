class Announcement < ApplicationRecord
  belongs_to :course
  belongs_to :educator, class_name: 'User', foreign_key: 'educator_id'

  validates :title, presence: true
  validates :message, presence: true
end
