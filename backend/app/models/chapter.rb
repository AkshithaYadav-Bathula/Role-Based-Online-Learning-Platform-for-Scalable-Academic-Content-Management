class Chapter < ApplicationRecord
  belongs_to :course
  has_many :lectures, dependent: :destroy
  
  validates :chapter_title, presence: true
  validates :chapter_order, presence: true, numericality: { only_integer: true }
end