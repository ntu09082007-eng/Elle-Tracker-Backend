import { Category } from '../category/category.entity';
import { Snapshot } from '../snapshot/snapshot.entity';
import {
  Column,
  Entity,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('candidates')
export class Candidate {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id: string;

  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  // 🔥 CHỐT HẠ: Map chuẩn đét vào cột total_votes trong Supabase
  @Column({ name: 'total_votes', type: 'int', default: 0 })
  totalVotes: number;

  @ManyToOne(() => Category, (category) => category.candidates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Snapshot, (snapshot) => snapshot.candidate)
  snapshots: Snapshot[];
}
