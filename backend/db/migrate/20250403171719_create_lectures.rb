class CreateLectures < ActiveRecord::Migration[7.2]
  def change
    create_table :lectures, id: :uuid do |t|
      t.uuid :chapter_id, null: false
      t.string :lecture_title, null: false
      t.integer :lecture_duration, null: false
      t.string :lecture_url, null: false
      t.boolean :is_preview_free, null: false, default: false
      t.integer :lecture_order, null: false

      t.timestamps
    end
    add_foreign_key :lectures, :chapters, on_delete: :cascade
  end
end
