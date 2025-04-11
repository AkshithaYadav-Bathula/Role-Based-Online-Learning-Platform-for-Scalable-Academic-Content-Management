class CreateCourseRatings < ActiveRecord::Migration[7.2]
  def change
    create_table :course_ratings, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :course_id, null: false
      t.integer :rating, null: false, limit: 1

      t.timestamps
    end
    add_foreign_key :course_ratings, :users, on_delete: :cascade
    add_foreign_key :course_ratings, :courses, on_delete: :cascade
    add_index :course_ratings, [:user_id, :course_id], unique: true
  end
end
