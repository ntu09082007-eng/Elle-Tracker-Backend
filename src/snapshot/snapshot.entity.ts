import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';

@Entity('vote_snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'candidate_id', type: 'int' })
  candidateId: number;

  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'total_votes', type: 'bigint', default: 0 })
  totalVote: number;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamp' })
  recordedAt: Date;
}
