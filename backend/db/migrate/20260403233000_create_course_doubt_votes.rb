class CreateCourseDoubtVotes < ActiveRecord::Migration[7.2]
  def change
    create_table :course_doubt_votes, id: :uuid do |t|
      t.uuid :course_doubt_id, null: false
      t.uuid :user_id, null: false

      t.timestamps
    end

    add_foreign_key :course_doubt_votes, :course_doubts, on_delete: :cascade
    add_foreign_key :course_doubt_votes, :users, on_delete: :cascade

    add_index :course_doubt_votes, [:course_doubt_id, :user_id], unique: true
    add_index :course_doubt_votes, [:user_id, :created_at]
  end
end
