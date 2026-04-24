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
  @PrimaryColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @Column({ name: 'name' })
  name: string;

  // Mối quan hệ với Category
  @ManyToOne(() => Category, (category) => category.candidates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Snapshot, (snapshot) => snapshot.candidate)
  snapshots: Snapshot[];
}
