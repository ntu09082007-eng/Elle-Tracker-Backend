import { Column, Entity, PrimaryColumn } from 'typeorm';
import { OneToMany } from 'typeorm';
import { Candidate } from '../candidate/candidate.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

@Entity('categories')
export class Category {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id: string;

  @Column({ name: 'name' })
  name: string;

  // Một category có thể có nhiều candidate
  @OneToMany(() => Candidate, (candidate) => candidate.category)
  candidates: Candidate[];

  @OneToMany(() => Snapshot, (snapshot) => snapshot.category)
  snapshots: Snapshot[];
}
