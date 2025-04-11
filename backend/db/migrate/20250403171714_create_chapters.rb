class CreateChapters < ActiveRecord::Migration[7.2]
  def change
    create_table :chapters, id: :uuid do |t|
      t.uuid :course_id, null: false
      t.integer :chapter_order, null: false
      t.string :chapter_title, null: false

      t.timestamps
    end
    add_foreign_key :chapters, :courses, on_delete: :cascade
  end
end
