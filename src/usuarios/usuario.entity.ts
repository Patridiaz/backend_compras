import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { RolUser } from './rol-user.entity';
import { AreaRevisora } from '../areas/entities/area.entity'; 

@Entity('user')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column() // ✅ Ensure this property exists
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;


  @ManyToOne(() => AreaRevisora, { nullable: true })
  @JoinColumn({ name: 'area_revisora_id' }) 
  areaRevisora: AreaRevisora | null;

  @ManyToMany(() => RolUser, rol => rol.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'rolUserId', referencedColumnName: 'id' },
  })
  roles: RolUser[];
}