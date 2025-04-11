class Lecture < ApplicationRecord
  belongs_to :chapter
  
  validates :lecture_title, presence: true
  validates :lecture_duration, presence: true, numericality: { only_integer: true }
  validates :lecture_url, presence: true
  validates :lecture_order, presence: true, numericality: { only_integer: true }
end