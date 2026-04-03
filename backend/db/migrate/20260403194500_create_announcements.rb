class CreateAnnouncements < ActiveRecord::Migration[7.2]
  def change
    create_table :announcements, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.uuid :course_id, null: false
      t.uuid :educator_id, null: false
      t.string :title, null: false
      t.text :message, null: false

      t.timestamps
    end

    add_index :announcements, [:course_id, :created_at]
    add_foreign_key :announcements, :courses, on_delete: :cascade
    add_foreign_key :announcements, :users, column: :educator_id, on_delete: :cascade
  end
end
